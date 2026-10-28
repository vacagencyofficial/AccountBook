-- 사입노트 클라우드 스키마 (Supabase SQL Editor에서 실행)

create extension if not exists "pgcrypto";

-- 워크스페이스(기기 간 공유 코드)
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  building text default '',
  floor text default '',
  unit text default '',
  phone text default '',
  memo text default '',
  last_visited_at bigint default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists shops_workspace_idx on shops(workspace_id);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  shop_id uuid references shops(id) on delete set null,
  date text not null,
  name text not null default '',
  category text not null default '기타',
  color text default '',
  size text default '',
  price integer not null default 0,
  qty integer not null default 1,
  memo text default '',
  status text not null default '구매',
  created_at bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists items_workspace_idx on items(workspace_id);
create index if not exists items_date_idx on items(workspace_id, date);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists photos_item_idx on photos(item_id);

-- Storage bucket (대시보드에서 public read 권장)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 개인/소규모용: anon 키로 CRUD 허용 (프로젝트 URL을 비공개로 유지하세요)
alter table workspaces enable row level security;
alter table shops enable row level security;
alter table items enable row level security;
alter table photos enable row level security;

drop policy if exists workspaces_all on workspaces;
create policy workspaces_all on workspaces for all using (true) with check (true);

drop policy if exists shops_all on shops;
create policy shops_all on shops for all using (true) with check (true);

drop policy if exists items_all on items;
create policy items_all on items for all using (true) with check (true);

drop policy if exists photos_all on photos;
create policy photos_all on photos for all using (true) with check (true);

drop policy if exists photos_storage_read on storage.objects;
create policy photos_storage_read on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists photos_storage_write on storage.objects;
create policy photos_storage_write on storage.objects
  for insert with check (bucket_id = 'photos');

drop policy if exists photos_storage_update on storage.objects;
create policy photos_storage_update on storage.objects
  for update using (bucket_id = 'photos');

drop policy if exists photos_storage_delete on storage.objects;
create policy photos_storage_delete on storage.objects
  for delete using (bucket_id = 'photos');
