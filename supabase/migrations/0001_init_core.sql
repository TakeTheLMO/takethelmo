-- taketheLMO 1차 마이그레이션: 사용자 프로필, 연구실, 구성원, 감사로그 + RLS
-- 나머지 테이블(교육, 점검, 사고, LMO 등)은 단계별 마이그레이션으로 추가한다.

create extension if not exists "pgcrypto";

create type public.user_role as enum
  ('super_admin', 'safety_admin', 'lab_manager', 'lmo_manager', 'researcher');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'researcher',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS 정책에서 profiles를 다시 조회할 때 재귀를 피하기 위한 security definer 함수
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_user_role() in ('super_admin', 'safety_admin'), false) $$;

-- 가입 시 profiles 자동 생성 (권한은 항상 researcher로 시작)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role()); -- 본인 권한 상승 차단
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- labs ----------
create table public.labs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger labs_updated_at before update on public.labs
  for each row execute function public.set_updated_at();

create table public.lab_memberships (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_manager boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lab_id, user_id)
);
create trigger lab_memberships_updated_at before update on public.lab_memberships
  for each row execute function public.set_updated_at();

create or replace function public.is_lab_member(p_lab uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.lab_memberships where lab_id = p_lab and user_id = auth.uid()) $$;

alter table public.labs enable row level security;
create policy labs_select on public.labs
  for select to authenticated using (public.is_admin() or public.is_lab_member(id));
create policy labs_write_admin on public.labs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.lab_memberships enable row level security;
create policy memberships_select on public.lab_memberships
  for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy memberships_write_admin on public.lab_memberships
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- audit_logs ----------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated using (public.is_admin());
-- insert/update/delete 정책 없음: 서버(service role) 또는 트리거로만 기록, 수정·삭제 불가
