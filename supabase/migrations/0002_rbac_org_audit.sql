-- 0002: 범위(조직·부서·연구실·LMO시설) 기반 RBAC, 기관/연구실 관계, 감사로그, RLS 재설계
-- 0001의 구조는 유지하고 ALTER로 확장한다. 모든 정책은 "기본 거부"에서 출발한다.

-- ============================================================
-- 1. 공통 타입
-- ============================================================
create type public.record_status as enum ('active', 'inactive', 'closed', 'archived');
create type public.scope_type    as enum ('global', 'organization', 'department', 'lab', 'lmo_facility');

-- ============================================================
-- 2. 기관 / 부서 / 건물 / 호실
-- ============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_-]{2,32}$'),
  name text not null check (length(btrim(name)) > 0),
  status public.record_status not null default 'active',
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null check (length(btrim(name)) > 0),
  status public.record_status not null default 'active',
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null check (length(btrim(name)) > 0),
  status public.record_status not null default 'active',
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id),
  room_no text not null check (length(btrim(room_no)) > 0),
  floor text,
  status public.record_status not null default 'active',
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, room_no)
);

-- ============================================================
-- 3. profiles / labs / lab_memberships 확장
-- ============================================================
alter table public.profiles
  add column status public.record_status not null default 'active',
  add column organization_id uuid references public.organizations (id),
  add column department_id uuid references public.departments (id),
  add column retention_until date,                       -- 개인정보 보유기간 만료일
  add column created_by uuid references public.profiles (id),
  add column updated_by uuid references public.profiles (id);

alter table public.labs
  add column organization_id uuid references public.organizations (id),
  add column department_id uuid references public.departments (id),
  add column room_id uuid references public.rooms (id),
  add column status public.record_status not null default 'active',
  add column close_reason text,
  add column closed_at timestamptz,
  add column created_by uuid references public.profiles (id),
  add column updated_by uuid references public.profiles (id),
  add constraint labs_name_chk check (length(btrim(name)) > 0),
  add constraint labs_close_chk check (status not in ('closed', 'archived') or close_reason is not null);
comment on column public.labs.department is '폐기 예정: department_id 사용';
comment on column public.labs.location   is '폐기 예정: room_id 사용';
do $$ begin
  if not exists (select 1 from public.labs) then
    alter table public.labs alter column organization_id set not null;
  end if;
end $$;

alter table public.lab_memberships
  add column status public.record_status not null default 'active',
  add column started_at date not null default current_date,
  add column ended_at date,
  add column created_by uuid references public.profiles (id),
  add column updated_by uuid references public.profiles (id),
  add constraint lab_memberships_period_chk check (ended_at is null or ended_at >= started_at);

create table public.lab_member_roles (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.lab_memberships (id),
  member_role text not null check (member_role in
    ('principal_investigator', 'safety_officer', 'researcher', 'student', 'visiting')),
  status public.record_status not null default 'active',
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index lab_member_roles_active_uq
  on public.lab_member_roles (membership_id, member_role) where status = 'active';

create table public.membership_history (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.lab_memberships (id),
  lab_id uuid not null references public.labs (id),
  user_id uuid not null references public.profiles (id),
  change_type text not null check (change_type in ('joined', 'status_changed', 'manager_changed')),
  detail jsonb,
  changed_by uuid,
  created_at timestamptz not null default now()
);

-- LMO 시설: 범위 권한(lmo_manager)의 대상이라 최소 구조만 먼저 둔다. 허가·신고 등은 LMO 단계에서 추가.
create table public.lmo_facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  lab_id uuid references public.labs (id),
  name text not null check (length(btrim(name)) > 0),
  grade smallint check (grade between 1 and 4),
  status public.record_status not null default 'active',
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 4. 범위 기반 역할 부여 / 권한 레지스트리
-- ============================================================
create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  role public.user_role not null,
  scope_type public.scope_type not null,
  scope_id uuid,
  status public.record_status not null default 'active',
  expires_at timestamptz,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ra_scope_chk check ((scope_type = 'global') = (scope_id is null)),
  constraint ra_role_chk check (role in ('safety_admin', 'lab_manager', 'lmo_manager')),
  constraint ra_role_scope_chk check (
    (role = 'safety_admin' and scope_type in ('global', 'organization')) or
    (role = 'lab_manager'  and scope_type in ('organization', 'department', 'lab')) or
    (role = 'lmo_manager'  and scope_type in ('organization', 'lmo_facility')))
);
create unique index role_assignments_active_uq on public.role_assignments
  (user_id, role, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'active';

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  role public.user_role not null,
  resource text not null,
  action text not null,
  unique (role, resource, action)
);
insert into public.permissions (role, resource, action) values
  ('super_admin',  'system',          'manage'),
  ('safety_admin', 'users',           'manage'),
  ('safety_admin', 'labs',            'manage'),
  ('safety_admin', 'audit_logs',      'read'),
  ('lab_manager',  'labs',            'manage'),
  ('lab_manager',  'lab_memberships', 'manage'),
  ('lmo_manager',  'lmo_facilities',  'manage'),
  ('researcher',   'profile',         'update_self');

-- FK 인덱스
create index on public.departments (organization_id);
create index on public.buildings (organization_id);
create index on public.rooms (building_id);
create index on public.profiles (organization_id);
create index on public.profiles (department_id);
create index on public.labs (organization_id);
create index on public.labs (department_id);
create index on public.labs (room_id);
create index on public.lab_memberships (user_id) where status = 'active';
create index on public.lab_memberships (lab_id);
create index on public.lab_member_roles (membership_id);
create index on public.membership_history (membership_id);
create index on public.membership_history (lab_id);
create index on public.lmo_facilities (organization_id);
create index on public.lmo_facilities (lab_id);
create index on public.role_assignments (user_id) where status = 'active';
create index on public.role_assignments (scope_type, scope_id);

-- ============================================================
-- 5. 권한 헬퍼 함수 (security definer: RLS 재귀 방지, search_path 고정)
-- ============================================================
drop policy profiles_select        on public.profiles;
drop policy profiles_update_self   on public.profiles;
drop policy profiles_update_admin  on public.profiles;
drop policy labs_select            on public.labs;
drop policy labs_write_admin       on public.labs;
drop policy memberships_select     on public.lab_memberships;
drop policy memberships_write_admin on public.lab_memberships;
drop policy audit_logs_select_admin on public.audit_logs;
drop trigger profiles_updated_at        on public.profiles;
drop trigger labs_updated_at            on public.labs;
drop trigger lab_memberships_updated_at on public.lab_memberships;
drop function public.is_admin();

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and status = 'active') $$;

-- 비활성 계정은 항상 null → 모든 권한 검사에서 탈락
create or replace function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid() and status = 'active' $$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_user_role() = 'super_admin', false) $$;

-- p_org가 null이면 "전역 관리자인가"를 묻는 것과 같다
create or replace function public.is_org_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_super_admin() or (
    public.current_user_role() = 'safety_admin' and exists (
      select 1 from public.role_assignments ra
      where ra.user_id = auth.uid() and ra.status = 'active' and ra.role = 'safety_admin'
        and (ra.expires_at is null or ra.expires_at > now())
        and (ra.scope_type = 'global' or (ra.scope_type = 'organization' and ra.scope_id = p_org))))
$$;

create or replace function public.scope_org(p_type public.scope_type, p_id uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select case p_type
    when 'organization' then p_id
    when 'department'   then (select organization_id from public.departments where id = p_id)
    when 'lab'          then (select organization_id from public.labs where id = p_id)
    when 'lmo_facility' then (select organization_id from public.lmo_facilities where id = p_id)
  end
$$;

create or replace function public.is_in_org(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and status = 'active' and organization_id = p_org) $$;

create or replace function public.is_lab_member(p_lab uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1 from public.lab_memberships m
    where m.lab_id = p_lab and m.user_id = auth.uid() and m.status = 'active')
$$;

create or replace function public.has_lab_scope(p_roles public.user_role[], p_lab uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1 from public.labs l
    join public.role_assignments ra
      on ra.user_id = auth.uid() and ra.status = 'active' and ra.role = any (p_roles)
     and (ra.expires_at is null or ra.expires_at > now())
    where l.id = p_lab and (
      ra.scope_type = 'global'
      or (ra.scope_type = 'organization' and ra.scope_id = l.organization_id)
      or (ra.scope_type = 'department'   and ra.scope_id = l.department_id)
      or (ra.scope_type = 'lab'          and ra.scope_id = l.id)))
$$;

create or replace function public.can_manage_lab(p_lab uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_super_admin()
          or public.has_lab_scope(array['safety_admin', 'lab_manager']::public.user_role[], p_lab) $$;

create or replace function public.can_access_lab(p_lab uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select public.can_manage_lab(p_lab) or public.is_lab_member(p_lab) $$;

create or replace function public.can_manage_facility(p_fac uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_super_admin() or (public.is_active_user() and exists (
    select 1 from public.lmo_facilities f
    join public.role_assignments ra
      on ra.user_id = auth.uid() and ra.status = 'active'
     and ra.role in ('safety_admin', 'lmo_manager')
     and (ra.expires_at is null or ra.expires_at > now())
    where f.id = p_fac and (
      ra.scope_type = 'global'
      or (ra.scope_type = 'organization' and ra.scope_id = f.organization_id)
      or (ra.scope_type = 'lmo_facility' and ra.scope_id = f.id))))
$$;

create or replace function public.can_manage_user(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_super_admin() or (public.is_active_user() and exists (
    select 1 from public.profiles t where t.id = p_user and public.is_org_admin(t.organization_id)))
$$;

-- safety_admin은 lab_manager/lmo_manager만 자기 조직 범위 안에서 부여 가능. safety_admin·super_admin 지정은 super_admin 전용.
create or replace function public.can_grant_role(p_role public.user_role, p_type public.scope_type, p_scope uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_super_admin() or (
    p_role in ('lab_manager', 'lmo_manager') and p_type <> 'global'
    and public.is_org_admin(public.scope_org(p_type, p_scope)))
$$;

create or replace function public.has_permission(p_resource text, p_action text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.permissions
        where role = public.current_user_role() and resource = p_resource and action = p_action) $$;

-- ============================================================
-- 6. 공통 트리거: 생성자/수정자, 하드 삭제 금지
-- ============================================================
create or replace function public.set_audit_columns() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), old.updated_by);
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.prevent_hard_delete() returns trigger
language plpgsql as $$
begin
  raise exception '% 데이터는 삭제할 수 없습니다. status를 inactive/closed/archived로 변경하세요.', tg_table_name
    using errcode = '42501';
end $$;

-- ============================================================
-- 7. 감사로그 확장 + 자동 기록 트리거 + 불변성
-- ============================================================
alter table public.audit_logs
  add column actor_role text,
  add column organization_id uuid,
  add column before_data jsonb,
  add column after_data jsonb,
  add column request_id text,
  add column client_info jsonb;
create index on public.audit_logs (created_at desc);
create index on public.audit_logs (organization_id, created_at desc);
create index on public.audit_logs (target_table, target_id);
create index on public.audit_logs (actor_id);

create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_redact  text[] := tg_argv;                 -- 감사로그에 남기지 않을 컬럼
  v_old     jsonb;
  v_new     jsonb;
  v_action  text := tg_table_name || '.' || lower(tg_op);
  v_actor   uuid := auth.uid();
  v_headers jsonb;
  v_org     uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old) - v_redact; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new) - v_redact; end if;
  if tg_op = 'UPDATE' and (v_old - 'updated_at' - 'updated_by') = (v_new - 'updated_at' - 'updated_by') then
    return null;                               -- 실질 변경 없음
  end if;
  if tg_table_name = 'profiles' and tg_op = 'UPDATE' then
    if new.role is distinct from old.role then v_action := 'profile.role_change';
    elsif new.status is distinct from old.status then v_action := 'profile.status_change';
    end if;
  end if;

  v_org := coalesce(v_new ->> 'organization_id', v_old ->> 'organization_id')::uuid;
  if tg_table_name = 'organizations' then v_org := coalesce(v_new ->> 'id', v_old ->> 'id')::uuid; end if;

  begin v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then v_headers := null; end;

  insert into public.audit_logs
    (actor_id, actor_role, action, target_table, target_id, organization_id,
     before_data, after_data, request_id, client_info)
  values
    (v_actor, (select role::text from public.profiles where id = v_actor), v_action, tg_table_name,
     coalesce(v_new ->> 'id', v_old ->> 'id')::uuid, v_org, v_old, v_new,
     coalesce(v_headers ->> 'x-request-id', 'txn-' || txid_current()),
     case when v_headers is null then null
          else jsonb_build_object('user_agent', v_headers ->> 'user-agent') end);  -- IP는 개인정보라 기본 미저장
  return null;
end $$;

create or replace function public.audit_logs_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_logs는 수정·삭제할 수 없습니다.' using errcode = '42501';
end $$;
create trigger audit_logs_no_change before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
  for each statement execute function public.audit_logs_immutable();

-- 서버(service_role)에서 로그인·파일 업로드 같은 비-DB 이벤트를 기록할 때 사용
create or replace function public.write_audit_log(
  p_actor uuid, p_action text, p_target_table text default null, p_target_id uuid default null,
  p_detail jsonb default null, p_request_id text default null, p_client_info jsonb default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs
    (actor_id, actor_role, action, target_table, target_id, organization_id, detail, request_id, client_info)
  select p_actor, (select role::text from public.profiles where id = p_actor), p_action, p_target_table, p_target_id,
         (select organization_id from public.profiles where id = p_actor),
         p_detail, coalesce(p_request_id, 'srv-' || gen_random_uuid()::text), p_client_info
$$;
revoke execute on function public.write_audit_log(uuid, text, text, uuid, jsonb, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.write_audit_log(uuid, text, text, uuid, jsonb, text, jsonb) to service_role;

-- 새 테이블에 표준 트리거(생성자/수정자, 삭제금지, 감사)를 붙이는 헬퍼. 이후 마이그레이션에서 재사용.
create or replace function public.attach_standard_triggers(p_table regclass, p_redact text[] default '{}')
returns void language plpgsql as $$
declare
  t text := (select relname from pg_class where oid = p_table);
  args text := coalesce((select string_agg(quote_literal(x), ',') from unnest(p_redact) x), '');
begin
  execute format('create trigger %I before insert or update on %s for each row execute function public.set_audit_columns()', t || '_audit_cols', p_table);
  execute format('create trigger %I before delete on %s for each row execute function public.prevent_hard_delete()', t || '_no_delete', p_table);
  execute format('create trigger %I after insert or update or delete on %s for each row execute function public.audit_row_change(%s)', t || '_audit', p_table, args);
end $$;
revoke execute on function public.attach_standard_triggers(regclass, text[]) from public, anon, authenticated;

select public.attach_standard_triggers('public.profiles', array['email', 'full_name']);
select public.attach_standard_triggers('public.organizations');
select public.attach_standard_triggers('public.departments');
select public.attach_standard_triggers('public.buildings');
select public.attach_standard_triggers('public.rooms');
select public.attach_standard_triggers('public.labs');
select public.attach_standard_triggers('public.lab_memberships');
select public.attach_standard_triggers('public.lab_member_roles');
select public.attach_standard_triggers('public.role_assignments');
select public.attach_standard_triggers('public.lmo_facilities');

-- ============================================================
-- 8. 업무 규칙 트리거 (권한 상승 방지 등)
-- ============================================================
create or replace function public.guard_profile_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_role  public.user_role;
  v_priv  constant public.user_role[] := array['super_admin', 'safety_admin']::public.user_role[];
begin
  if v_actor is null then return new; end if;          -- service_role / SQL Editor: 신뢰된 서버 경로
  v_role := public.current_user_role();
  if v_role is null then
    raise exception '비활성 계정은 변경 작업을 할 수 없습니다.' using errcode = '42501';
  end if;
  if new.id <> old.id or new.email is distinct from old.email then
    raise exception '식별 정보는 변경할 수 없습니다.' using errcode = '42501';
  end if;

  if new.role is distinct from old.role or new.status is distinct from old.status then
    if new.id = v_actor then
      raise exception '본인의 권한과 상태는 변경할 수 없습니다.' using errcode = '42501';
    end if;
    if not public.can_manage_user(old.id) then
      raise exception '이 사용자를 관리할 권한이 없습니다.' using errcode = '42501';
    end if;
    if (old.role = any (v_priv) or new.role = any (v_priv)) and v_role <> 'super_admin' then
      raise exception 'super_admin/safety_admin 권한 지정·해제와 해당 계정 변경은 super_admin만 가능합니다.' using errcode = '42501';
    end if;
  end if;

  if new.organization_id is distinct from old.organization_id or new.department_id is distinct from old.department_id then
    if not (public.is_org_admin(old.organization_id) and public.is_org_admin(new.organization_id))
       or (new.id = v_actor and v_role <> 'super_admin') then
      raise exception '소속 변경 권한이 없습니다.' using errcode = '42501';
    end if;
  end if;

  if new.retention_until is distinct from old.retention_until and not public.can_manage_user(old.id) then
    raise exception '보유기간은 관리자만 변경할 수 있습니다.' using errcode = '42501';
  end if;

  if old.role = 'super_admin' and old.status = 'active'
     and (new.role <> 'super_admin' or new.status <> 'active')
     and not exists (select 1 from public.profiles
                     where role = 'super_admin' and status = 'active' and id <> old.id) then
    raise exception '마지막 super_admin은 변경할 수 없습니다.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_change();

-- 역할이 바뀌면 이전 역할의 범위 부여는 자동 비활성화
create or replace function public.deactivate_stale_assignments() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.role_assignments set status = 'inactive'
  where user_id = new.id and status = 'active' and (role <> new.role or new.status <> 'active');
  return null;
end $$;
create trigger profiles_role_sync after update of role, status on public.profiles
  for each row execute function public.deactivate_stale_assignments();

create or replace function public.guard_role_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.user_id, new.role, new.scope_type, new.scope_id)
       is distinct from (old.user_id, old.role, old.scope_type, old.scope_id) then
    raise exception '부여 대상·역할·범위는 수정할 수 없습니다. 비활성화 후 새로 부여하세요.' using errcode = '42501';
  end if;
  if new.status = 'active' then
    if (select role from public.profiles where id = new.user_id) is distinct from new.role then
      raise exception '사용자의 기본 역할(profiles.role)과 부여 역할이 일치해야 합니다.' using errcode = '23514';
    end if;
    if new.scope_type <> 'global' and public.scope_org(new.scope_type, new.scope_id) is null then
      raise exception '존재하지 않는 범위입니다.' using errcode = '23503';
    end if;
  end if;
  if auth.uid() is not null and new.user_id = auth.uid() and not public.is_super_admin() then
    raise exception '본인에게 역할을 부여할 수 없습니다.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger role_assignments_guard before insert or update on public.role_assignments
  for each row execute function public.guard_role_assignment();

create or replace function public.guard_org_scoped_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and new.organization_id is distinct from old.organization_id
     and not public.is_super_admin() then
    raise exception '소속 기관은 super_admin만 변경할 수 있습니다.' using errcode = '42501';
  end if;
  if tg_table_name = 'labs' and new.status is distinct from old.status then
    if new.status in ('closed', 'archived') then
      if auth.uid() is not null and not public.is_org_admin(new.organization_id) then
        raise exception '연구실 폐쇄는 기관 안전관리자만 처리할 수 있습니다.' using errcode = '42501';
      end if;
      new.closed_at := coalesce(new.closed_at, now());
    else
      new.closed_at := null;
    end if;
  end if;
  return new;
end $$;
create trigger labs_guard before update on public.labs
  for each row execute function public.guard_org_scoped_row();
create trigger lmo_facilities_guard before update on public.lmo_facilities
  for each row execute function public.guard_org_scoped_row();

create or replace function public.log_membership_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.membership_history (membership_id, lab_id, user_id, change_type, detail, changed_by)
    values (new.id, new.lab_id, new.user_id, 'joined', jsonb_build_object('is_manager', new.is_manager), auth.uid());
  else
    if new.status is distinct from old.status then
      insert into public.membership_history (membership_id, lab_id, user_id, change_type, detail, changed_by)
      values (new.id, new.lab_id, new.user_id, 'status_changed',
              jsonb_build_object('from', old.status, 'to', new.status), auth.uid());
    end if;
    if new.is_manager is distinct from old.is_manager then
      insert into public.membership_history (membership_id, lab_id, user_id, change_type, detail, changed_by)
      values (new.id, new.lab_id, new.user_id, 'manager_changed',
              jsonb_build_object('from', old.is_manager, 'to', new.is_manager), auth.uid());
    end if;
  end if;
  return null;
end $$;
create trigger lab_memberships_history after insert or update on public.lab_memberships
  for each row execute function public.log_membership_history();
-- 이력 테이블은 추가만 가능(수정·삭제 불가)
create or replace function public.reject_change() returns trigger
language plpgsql as $$
begin
  raise exception '% 이력은 수정·삭제할 수 없습니다.', tg_table_name using errcode = '42501';
end $$;
create trigger membership_history_append_only before update or delete on public.membership_history
  for each row execute function public.reject_change();

-- ============================================================
-- 9. GRANT: 기본 권한을 걷어내고 필요한 것만 부여
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','organizations','departments','buildings','rooms','labs',
    'lab_memberships','lab_member_roles','membership_history','lmo_facilities','role_assignments',
    'permissions','audit_logs'] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
  -- DELETE는 어떤 테이블에도 부여하지 않는다 (비활성화/폐쇄 방식)
  foreach t in array array['profiles','organizations','departments','buildings','rooms','labs',
    'lab_memberships','lab_member_roles','lmo_facilities','role_assignments'] loop
    execute format('grant select, update on public.%I to authenticated', t);
  end loop;
  foreach t in array array['organizations','departments','buildings','rooms','labs',
    'lab_memberships','lab_member_roles','lmo_facilities','role_assignments'] loop
    execute format('grant insert on public.%I to authenticated', t);
  end loop;
  grant select on public.membership_history, public.permissions, public.audit_logs to authenticated;
end $$;
-- profiles에는 INSERT 권한이 없다: 생성은 handle_new_user 트리거(가입/초대)만 수행

-- ============================================================
-- 10. RLS 정책 (모든 정책은 활성 사용자 + 범위 검사를 거친다)
-- ============================================================
alter table public.organizations       enable row level security;
alter table public.departments         enable row level security;
alter table public.buildings           enable row level security;
alter table public.rooms               enable row level security;
alter table public.lab_member_roles    enable row level security;
alter table public.membership_history  enable row level security;
alter table public.lmo_facilities      enable row level security;
alter table public.role_assignments    enable row level security;
alter table public.permissions         enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_active_user() and (id = auth.uid() or public.can_manage_user(id)));
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_active_user() and (id = auth.uid() or public.can_manage_user(id)))
  with check (public.is_active_user() and (id = auth.uid() or public.can_manage_user(id)));

-- organizations: 소속자 조회, 생성·수정은 super_admin만
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_in_org(id) or public.is_org_admin(id));
create policy organizations_insert on public.organizations for insert to authenticated
  with check (public.is_super_admin());
create policy organizations_update on public.organizations for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- departments / buildings
create policy departments_select on public.departments for select to authenticated
  using (public.is_in_org(organization_id) or public.is_org_admin(organization_id));
create policy departments_insert on public.departments for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy departments_update on public.departments for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy buildings_select on public.buildings for select to authenticated
  using (public.is_in_org(organization_id) or public.is_org_admin(organization_id));
create policy buildings_insert on public.buildings for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy buildings_update on public.buildings for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- rooms (기관은 건물을 통해 결정)
create or replace function public.building_org(p_building uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select organization_id from public.buildings where id = p_building $$;
create policy rooms_select on public.rooms for select to authenticated
  using (public.is_in_org(public.building_org(building_id)) or public.is_org_admin(public.building_org(building_id)));
create policy rooms_insert on public.rooms for insert to authenticated
  with check (public.is_org_admin(public.building_org(building_id)));
create policy rooms_update on public.rooms for update to authenticated
  using (public.is_org_admin(public.building_org(building_id)))
  with check (public.is_org_admin(public.building_org(building_id)));

-- labs
create policy labs_select on public.labs for select to authenticated
  using (public.can_access_lab(id));
create policy labs_insert on public.labs for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy labs_update on public.labs for update to authenticated
  using (public.can_manage_lab(id)) with check (public.can_manage_lab(id));

-- lab_memberships / lab_member_roles / membership_history
create policy memberships_select on public.lab_memberships for select to authenticated
  using (public.is_active_user() and (user_id = auth.uid() or public.can_manage_lab(lab_id)));
create policy memberships_insert on public.lab_memberships for insert to authenticated
  with check (public.can_manage_lab(lab_id));
create policy memberships_update on public.lab_memberships for update to authenticated
  using (public.can_manage_lab(lab_id)) with check (public.can_manage_lab(lab_id));

create or replace function public.membership_lab(p_membership uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select lab_id from public.lab_memberships where id = p_membership $$;
create policy member_roles_select on public.lab_member_roles for select to authenticated
  using (public.can_manage_lab(public.membership_lab(membership_id))
         or exists (select 1 from public.lab_memberships m where m.id = membership_id and m.user_id = auth.uid()));
create policy member_roles_insert on public.lab_member_roles for insert to authenticated
  with check (public.can_manage_lab(public.membership_lab(membership_id)));
create policy member_roles_update on public.lab_member_roles for update to authenticated
  using (public.can_manage_lab(public.membership_lab(membership_id)))
  with check (public.can_manage_lab(public.membership_lab(membership_id)));

create policy membership_history_select on public.membership_history for select to authenticated
  using (public.can_manage_lab(lab_id) or user_id = auth.uid());

-- lmo_facilities (담당 시설 데이터만)
create policy lmo_facilities_select on public.lmo_facilities for select to authenticated
  using (public.can_manage_facility(id));
create policy lmo_facilities_insert on public.lmo_facilities for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy lmo_facilities_update on public.lmo_facilities for update to authenticated
  using (public.can_manage_facility(id)) with check (public.can_manage_facility(id));

-- role_assignments
create policy role_assignments_select on public.role_assignments for select to authenticated
  using (public.is_active_user() and (user_id = auth.uid() or public.is_super_admin()
         or public.is_org_admin(public.scope_org(scope_type, scope_id))));
create policy role_assignments_insert on public.role_assignments for insert to authenticated
  with check (public.can_grant_role(role, scope_type, scope_id) and public.can_manage_user(user_id));
create policy role_assignments_update on public.role_assignments for update to authenticated
  using (public.can_grant_role(role, scope_type, scope_id))
  with check (public.can_grant_role(role, scope_type, scope_id) and public.can_manage_user(user_id));

-- permissions: 참조 데이터 (읽기만)
create policy permissions_select on public.permissions for select to authenticated
  using (public.is_active_user());

-- audit_logs: 기관 범위 관리자만 조회, 쓰기 정책 없음(트리거/서버 함수 전용)
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.is_org_admin(organization_id));

-- ============================================================
-- 11. 가입 트리거 갱신: 항상 researcher + active. 조직 지정은 서버(service_role)에서만.
-- ============================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (new.id, new.email, nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'researcher', 'active');
  return new;
end $$;
