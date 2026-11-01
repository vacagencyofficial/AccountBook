-- 간편 로그인(카카오·구글·애플) 계정과 장부 연결 (Supabase SQL Editor에서 실행)
-- schema.sql → secure.sql 다음에 실행합니다. 여러 번 실행해도 안전합니다.
--
-- 바뀌는 점
-- 1) 로그인한 계정과 장부를 잇는 표(workspace_members)가 생깁니다.
-- 2) 로그인하면 폰을 바꿔도 같은 장부가 열립니다. (장부 번호 방식·초대 링크는 그대로)
-- 3) 회원 탈퇴 시 혼자 쓰던 장부와 사진, 계정을 지웁니다.

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on workspace_members(user_id, created_at desc);

-- 표 직접 접근은 막고 아래 함수로만 다룸 (secure.sql과 같은 방식)
alter table workspace_members enable row level security;
revoke all on table workspace_members from anon, authenticated;

-- 로그인한 사람 id (없으면 오류)
create or replace function sailp_require_user()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'login_required' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

revoke all on function sailp_require_user() from public, anon, authenticated;

-- 내 계정 장부 (가장 최근에 연결한 것). 없으면 null
create or replace function sailp_my_workspace()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := sailp_require_user();
  v_row record;
begin
  select w.id, w.code into v_row
  from workspace_members m
  join workspaces w on w.id = m.workspace_id
  where m.user_id = v_uid
  order by m.created_at desc
  limit 1;

  if v_row.id is null then
    return null;
  end if;
  return jsonb_build_object('id', v_row.id, 'code', v_row.code);
end;
$$;

-- 장부 번호로 지금 장부를 내 계정에 연결 (게스트로 쓰던 장부·초대받은 장부)
create or replace function sailp_link_workspace(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := sailp_require_user();
  v_ws uuid := sailp_require_ws(p_code);
  v_role text;
begin
  -- 이미 계정이 연결된 장부면 같이 쓰는 사람(member), 처음이면 주인(owner)
  select case when exists (select 1 from workspace_members where workspace_id = v_ws and user_id <> v_uid)
    then 'member' else 'owner' end
  into v_role;

  insert into workspace_members (workspace_id, user_id, role)
  values (v_ws, v_uid, v_role)
  on conflict (workspace_id, user_id) do update set created_at = now();

  return (select jsonb_build_object('id', id, 'code', code) from workspaces where id = v_ws);
end;
$$;

-- 계정에 새 장부 만들기
create or replace function sailp_create_my_workspace()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := sailp_require_user();
  v_ws jsonb;
begin
  v_ws := sailp_create_workspace();
  insert into workspace_members (workspace_id, user_id, role)
  values ((v_ws->>'id')::uuid, v_uid, 'owner');
  return v_ws;
end;
$$;

-- 탈퇴 1단계: 혼자 쓰던 장부의 사진을 지움 표시하고 파일 경로를 돌려줌
-- (앱이 이 경로로 저장소 파일을 지운 뒤 2단계를 부름)
create or replace function sailp_delete_account_prepare()
returns text[]
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := sailp_require_user();
  v_paths text[];
begin
  with solo as (
    select m.workspace_id from workspace_members m
    where m.user_id = v_uid
      and not exists (
        select 1 from workspace_members o where o.workspace_id = m.workspace_id and o.user_id <> v_uid
      )
  ), d as (
    update photos set deleted_at = coalesce(deleted_at, now())
    where workspace_id in (select workspace_id from solo)
    returning storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into v_paths from d;
  return v_paths;
end;
$$;

-- 탈퇴 2단계: 혼자 쓰던 장부를 지우고(같이 쓰는 장부는 내 연결만 끊음) 계정을 지움
create or replace function sailp_delete_account()
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := sailp_require_user();
begin
  delete from workspaces w
  where w.id in (select workspace_id from workspace_members where user_id = v_uid)
    and not exists (
      select 1 from workspace_members o where o.workspace_id = w.id and o.user_id <> v_uid
    );
  delete from workspace_members where user_id = v_uid;
  delete from auth.users where id = v_uid;
  return true;
end;
$$;

revoke all on function
  sailp_my_workspace(),
  sailp_link_workspace(text),
  sailp_create_my_workspace(),
  sailp_delete_account_prepare(),
  sailp_delete_account()
from public, anon;

grant execute on function
  sailp_my_workspace(),
  sailp_link_workspace(text),
  sailp_create_my_workspace(),
  sailp_delete_account_prepare(),
  sailp_delete_account()
to authenticated;
