-- 0003: 공지사항 (docs/pages/community-notices.md)
-- published_at null = 임시저장. status inactive = 게시중단. 하드 삭제 없음.

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(btrim(body)) > 0 and length(body) <= 20000),
  is_pinned boolean not null default false,
  published_at timestamptz,
  status public.record_status not null default 'active'
    check (status in ('active', 'inactive')),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notices_org_published_idx on public.notices (organization_id, is_pinned desc, published_at desc)
  where status = 'active';
create index notices_org_updated_idx on public.notices (organization_id, updated_at desc);

-- 생성자/수정자 자동 입력 + 하드 삭제 금지 + 감사로그 자동 기록
select public.attach_standard_triggers('public.notices');
-- 소속 기관 변경은 super_admin만 (labs/lmo_facilities와 같은 가드)
create trigger notices_guard before update on public.notices
  for each row execute function public.guard_org_scoped_row();

-- GRANT: 기본 회수 후 필요한 것만 (DELETE 는 부여하지 않음)
revoke all on public.notices from anon, authenticated;
grant select, insert, update on public.notices to authenticated;

-- RLS
alter table public.notices enable row level security;

-- 일반 사용자: 소속 기관의 게시 중인 공지만
create policy notices_select on public.notices for select to authenticated
  using (public.is_active_user() and status = 'active'
         and published_at is not null and published_at <= now()
         and public.is_in_org(organization_id));
-- 기관 관리자: 임시저장·게시중단 포함 전체
create policy notices_select_admin on public.notices for select to authenticated
  using (public.is_org_admin(organization_id));
create policy notices_insert on public.notices for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy notices_update on public.notices for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
