-- 사입노트 클라우드 보안 설정 (Supabase SQL Editor에서 실행)
-- schema.sql 다음에 실행합니다. 여러 번 실행해도 안전합니다.
--
-- 바뀌는 점
-- 1) 앱(anon 키)이 표를 직접 읽고 쓰는 길을 모두 막습니다.
-- 2) 대신 아래 sailp_* 함수가 「장부 번호」를 확인한 뒤 그 장부의 자료만 다룹니다.
-- 3) 사진은 목록 조회를 막고, 장부 id(추측 불가)로 시작하는 주소로만 열립니다.

create extension if not exists "pgcrypto";

-- 동기화용 열 (마지막 수정 시각·가게 숨김·사진 삭제 표시)
alter table shops add column if not exists client_updated_at bigint not null default 0;
alter table shops add column if not exists hidden boolean not null default false;
alter table items add column if not exists client_updated_at bigint not null default 0;
alter table items add column if not exists starred boolean not null default false;
alter table photos add column if not exists deleted_at timestamptz;

-- ─────────────────────────────────────────────
-- 1. 표 직접 접근 차단
-- ─────────────────────────────────────────────
alter table workspaces enable row level security;
alter table shops enable row level security;
alter table items enable row level security;
alter table photos enable row level security;

drop policy if exists workspaces_all on workspaces;
drop policy if exists shops_all on shops;
drop policy if exists items_all on items;
drop policy if exists photos_all on photos;

revoke all on table workspaces, shops, items, photos from anon, authenticated;

-- ─────────────────────────────────────────────
-- 2. 내부 도우미 (앱에서 직접 호출 불가)
-- ─────────────────────────────────────────────
create or replace function sailp_require_ws(p_code text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from workspaces where code = upper(trim(coalesce(p_code, '')));
  if v_id is null then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

revoke all on function sailp_require_ws(text) from public, anon, authenticated;

-- 사진 업로드 정책에서 사용: 폴더 이름이 실제 장부 id인지 확인
create or replace function sailp_ws_exists(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from workspaces where id::text = p_id);
$$;

-- ─────────────────────────────────────────────
-- 3. 앱에서 호출하는 함수
-- ─────────────────────────────────────────────

-- 추측하기 어려운 10자리 장부 번호 만들기 (내부용)
create or replace function sailp_new_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := gen_random_bytes(10);
  v_code text := 'SAILP-';
  i int;
begin
  for i in 0..9 loop
    v_code := v_code || substr(v_alphabet, 1 + (get_byte(v_bytes, i) % 32), 1);
  end loop;
  return v_code;
end;
$$;

revoke all on function sailp_new_code() from public, anon, authenticated;

-- 새 장부 만들기 (번호는 서버가 10자리로 생성)
create or replace function sailp_create_workspace()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_id uuid;
begin
  loop
    v_code := sailp_new_code();
    begin
      insert into workspaces (code) values (v_code) returning id into v_id;
      return jsonb_build_object('id', v_id, 'code', v_code);
    exception when unique_violation then
      -- 같은 번호가 이미 있으면 다시 생성
    end;
  end loop;
end;
$$;

-- 장부 번호를 새 10자리로 바꾸기 (옛 6자리 번호 쓰던 장부용). 옛 번호는 더 이상 열리지 않음
create or replace function sailp_rotate_code(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ws uuid := sailp_require_ws(p_code);
  v_code text;
begin
  loop
    v_code := sailp_new_code();
    begin
      update workspaces set code = v_code where id = v_ws;
      return jsonb_build_object('id', v_ws, 'code', v_code);
    exception when unique_violation then
      -- 같은 번호가 이미 있으면 다시 생성
    end;
  end loop;
end;
$$;

-- 장부 번호로 열기 (없으면 null)
create or replace function sailp_open_workspace(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('id', id, 'code', code)
  from workspaces
  where code = upper(trim(coalesce(p_code, '')));
$$;

-- 가게 저장 → 클라우드 id 반환
-- p_id가 이 장부의 가게면 수정. 단, 클라우드 쪽이 더 최근에 고쳐졌거나 지워졌으면 그대로 둠
create or replace function sailp_upsert_shop(p_code text, p_id uuid, p_data jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ws uuid := sailp_require_ws(p_code);
  v_ts bigint := coalesce((p_data->>'client_updated_at')::bigint, 0);
  v_id uuid;
begin
  if p_id is not null then
    update shops set
      name = coalesce(p_data->>'name', ''),
      building = coalesce(p_data->>'building', ''),
      floor = coalesce(p_data->>'floor', ''),
      unit = coalesce(p_data->>'unit', ''),
      phone = coalesce(p_data->>'phone', ''),
      memo = coalesce(p_data->>'memo', ''),
      last_visited_at = coalesce((p_data->>'last_visited_at')::bigint, 0),
      hidden = coalesce((p_data->>'hidden')::boolean, false),
      client_updated_at = v_ts,
      updated_at = now()
    where id = p_id and workspace_id = v_ws and deleted_at is null and client_updated_at <= v_ts
    returning id into v_id;
    if v_id is not null then
      return v_id;
    end if;
    -- 이 장부에 이미 있는 가게(더 최근 수정·삭제됨)면 바꾸지 않고 id만 돌려줌
    select id into v_id from shops where id = p_id and workspace_id = v_ws;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into shops (workspace_id, name, building, floor, unit, phone, memo, last_visited_at, hidden, client_updated_at)
  values (
    v_ws,
    coalesce(p_data->>'name', ''),
    coalesce(p_data->>'building', ''),
    coalesce(p_data->>'floor', ''),
    coalesce(p_data->>'unit', ''),
    coalesce(p_data->>'phone', ''),
    coalesce(p_data->>'memo', ''),
    coalesce((p_data->>'last_visited_at')::bigint, 0),
    coalesce((p_data->>'hidden')::boolean, false),
    v_ts
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- 기록 저장 → 클라우드 id 반환 (가게와 같은 규칙: 더 최근 것이 이김, 지운 것은 되살리지 않음)
create or replace function sailp_upsert_item(p_code text, p_id uuid, p_data jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ws uuid := sailp_require_ws(p_code);
  v_ts bigint := coalesce((p_data->>'client_updated_at')::bigint, 0);
  v_shop uuid;
  v_id uuid;
begin
  -- 다른 장부의 가게는 연결하지 않음
  select id into v_shop
  from shops
  where id = nullif(p_data->>'shop_id', '')::uuid and workspace_id = v_ws;

  if p_id is not null then
    update items set
      shop_id = v_shop,
      date = coalesce(p_data->>'date', ''),
      name = coalesce(p_data->>'name', ''),
      category = coalesce(nullif(p_data->>'category', ''), '기타'),
      color = coalesce(p_data->>'color', ''),
      size = coalesce(p_data->>'size', ''),
      price = coalesce((p_data->>'price')::integer, 0),
      qty = coalesce((p_data->>'qty')::integer, 1),
      memo = coalesce(p_data->>'memo', ''),
      status = coalesce(nullif(p_data->>'status', ''), '구매'),
      starred = coalesce((p_data->>'starred')::boolean, false),
      created_at = coalesce((p_data->>'created_at')::bigint, created_at),
      client_updated_at = v_ts,
      updated_at = now()
    where id = p_id and workspace_id = v_ws and deleted_at is null and client_updated_at <= v_ts
    returning id into v_id;
    if v_id is not null then
      return v_id;
    end if;
    select id into v_id from items where id = p_id and workspace_id = v_ws;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into items (workspace_id, shop_id, date, name, category, color, size, price, qty, memo, status, starred, created_at, client_updated_at)
  values (
    v_ws,
    v_shop,
    coalesce(p_data->>'date', ''),
    coalesce(p_data->>'name', ''),
    coalesce(nullif(p_data->>'category', ''), '기타'),
    coalesce(p_data->>'color', ''),
    coalesce(p_data->>'size', ''),
    coalesce((p_data->>'price')::integer, 0),
    coalesce((p_data->>'qty')::integer, 1),
    coalesce(p_data->>'memo', ''),
    coalesce(nullif(p_data->>'status', ''), '구매'),
    coalesce((p_data->>'starred')::boolean, false),
    coalesce((p_data->>'created_at')::bigint, (extract(epoch from now()) * 1000)::bigint),
    v_ts
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- 기록에 올라간 사진 수
create or replace function sailp_item_photo_count(p_code text, p_item uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from photos
  where item_id = p_item and workspace_id = sailp_require_ws(p_code) and deleted_at is null;
$$;

-- 사진 기록 추가 (저장 경로는 반드시 이 장부 id 폴더)
create or replace function sailp_add_photo(p_code text, p_item uuid, p_path text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ws uuid := sailp_require_ws(p_code);
  v_id uuid;
begin
  if not exists (select 1 from items where id = p_item and workspace_id = v_ws) then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;
  if p_path is null or left(p_path, 37) <> v_ws::text || '/' then
    raise exception 'invalid_photo_path' using errcode = '22023';
  end if;

  insert into photos (workspace_id, item_id, storage_path)
  values (v_ws, p_item, p_path)
  returning id into v_id;
  return v_id;
end;
$$;

-- 장부 전체 내려받기 (삭제 표시된 가게·기록 제외)
create or replace function sailp_pull(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ws uuid := sailp_require_ws(p_code);
begin
  return jsonb_build_object(
    'shops', coalesce((
      select jsonb_agg(to_jsonb(s)) from shops s
      where s.workspace_id = v_ws and s.deleted_at is null
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(to_jsonb(i)) from items i
      where i.workspace_id = v_ws and i.deleted_at is null
    ), '[]'::jsonb),
    'photos', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at) from photos p
      where p.workspace_id = v_ws and p.deleted_at is null
    ), '[]'::jsonb),
    -- 다른 폰에서 지운 것: 이 폰에서도 지우도록 id만 전달
    'deleted', jsonb_build_object(
      'shops', coalesce((select jsonb_agg(id) from shops where workspace_id = v_ws and deleted_at is not null), '[]'::jsonb),
      'items', coalesce((select jsonb_agg(id) from items where workspace_id = v_ws and deleted_at is not null), '[]'::jsonb),
      'photos', coalesce((select jsonb_agg(id) from photos where workspace_id = v_ws and deleted_at is not null), '[]'::jsonb)
    )
  );
end;
$$;

-- 지우기 (삭제 표시만 남겨 다른 폰에도 전달)
-- 돌려주는 값: 이제 지워도 되는 사진 파일 경로 (앱이 저장소에서 파일을 지움)
drop function if exists sailp_delete(text, text, uuid);
create or replace function sailp_delete(p_code text, p_kind text, p_id uuid)
returns text[]
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ws uuid := sailp_require_ws(p_code);
  v_paths text[] := '{}';
begin
  if p_kind = 'shop' then
    update shops set deleted_at = coalesce(deleted_at, now()), updated_at = now()
    where id = p_id and workspace_id = v_ws;
  elsif p_kind = 'item' then
    update items set deleted_at = coalesce(deleted_at, now()), updated_at = now()
    where id = p_id and workspace_id = v_ws;
    with d as (
      update photos set deleted_at = coalesce(deleted_at, now())
      where item_id = p_id and workspace_id = v_ws
      returning storage_path
    )
    select coalesce(array_agg(storage_path), '{}') into v_paths from d;
  elsif p_kind = 'photo' then
    with d as (
      update photos set deleted_at = coalesce(deleted_at, now())
      where id = p_id and workspace_id = v_ws
      returning storage_path
    )
    select coalesce(array_agg(storage_path), '{}') into v_paths from d;
  else
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  return v_paths;
end;
$$;

grant execute on function
  sailp_rotate_code(text),
  sailp_delete(text, text, uuid),
  sailp_create_workspace(),
  sailp_open_workspace(text),
  sailp_upsert_shop(text, uuid, jsonb),
  sailp_upsert_item(text, uuid, jsonb),
  sailp_item_photo_count(text, uuid),
  sailp_add_photo(text, uuid, text),
  sailp_pull(text),
  sailp_ws_exists(text)
to anon, authenticated;

-- ─────────────────────────────────────────────
-- 4. 사진 저장소
-- ─────────────────────────────────────────────
-- 공개 버킷: 정확한 주소를 아는 사람만 사진을 볼 수 있음(주소에 추측 불가한 장부 id 포함)
update storage.buckets set public = true where id = 'photos';

-- 목록 조회·수정·삭제 금지 (목록이 열려 있으면 모든 장부 사진 주소가 드러남)
-- 단, 아래 cleanup 정책으로 「지운 사진」 파일만 보이고 지울 수 있음
drop policy if exists photos_storage_read on storage.objects;
drop policy if exists photos_storage_update on storage.objects;
drop policy if exists photos_storage_delete on storage.objects;

-- 지운 사진의 파일만 저장소에서 지울 수 있음 (사진 기록에 삭제 표시가 있는 파일만)
create or replace function sailp_photo_deletable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from photos where storage_path = p_name and deleted_at is not null);
$$;

grant execute on function sailp_photo_deletable(text) to anon, authenticated;

drop policy if exists photos_storage_cleanup_read on storage.objects;
create policy photos_storage_cleanup_read on storage.objects
  for select
  using (bucket_id = 'photos' and public.sailp_photo_deletable(name));

drop policy if exists photos_storage_cleanup_delete on storage.objects;
create policy photos_storage_cleanup_delete on storage.objects
  for delete
  using (bucket_id = 'photos' and public.sailp_photo_deletable(name));

-- 올리기는 실제 장부 id 폴더에만 허용
drop policy if exists photos_storage_write on storage.objects;
create policy photos_storage_write on storage.objects
  for insert
  with check (
    bucket_id = 'photos'
    and public.sailp_ws_exists((storage.foldername(name))[1])
  );
