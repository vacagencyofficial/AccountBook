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

-- 접근 정책·서버 함수는 secure.sql 에 있습니다.
-- 반드시 이 파일 다음에 supabase/secure.sql 도 실행하세요.
