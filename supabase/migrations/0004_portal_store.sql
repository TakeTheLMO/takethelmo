-- 0004: 포털 계정(D-15 의 "포털 계정" 체계) 저장소를 Supabase Postgres 로 이전
-- 서버리스 배포(Vercel)에서는 SQLite 파일을 쓸 수 없으므로 같은 스키마를 Postgres 에 둔다.
-- 로컬 개발·단위 테스트는 계속 SQLite(features/local-auth/sqlite.ts) 를 쓴다.
--
-- 접근 경로: Next.js 서버만 PORTAL_DATABASE_URL(서버 전용) 로 직접 접속한다.
-- Data API(anon/authenticated) 로는 어떤 행도 읽고 쓸 수 없도록 RLS 를 켜고 정책을 두지 않으며 권한도 회수한다.
-- 권한 검사(②·③)는 기존과 같이 accountAccess() 와 Store 의 this.admin(actor) 가 맡는다 (AGENTS.md 2-1).
--
-- attach_standard_triggers() 를 쓰지 않는 이유:
--  * set_audit_columns/audit_row_change 는 auth.uid()·uuid id·created_by 컬럼을 전제로 하는데 포털 계정은 Supabase Auth 사용자가 아니다.
--  * audit_row_change 는 행 전체를 audit_logs 에 남기므로 이메일·비밀번호 해시가 기록된다 (AGENTS.md 2-8 위반).
-- 대신 하드 삭제 금지(prevent_hard_delete)만 업무 테이블에 붙인다.
-- 세션·로그인 시도 테이블은 만료/로그아웃 시 삭제가 정상 동작이므로 예외다.

create table public.local_users (
  id text primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  salt text not null,
  active integer not null default 1,
  username text unique,
  role text not null default 'researcher',
  position text not null default '연구원'
);

create table public.local_sessions (
  token_hash text primary key,
  user_id text not null references public.local_users (id),
  expires_at bigint not null
);
create index on public.local_sessions (user_id);

create table public.local_auth_attempts (
  key text primary key,
  count integer not null,
  reset_at bigint not null
);

create table public.account_data (
  user_id text primary key references public.local_users (id),
  state text not null,
  revision integer not null,
  updated_at text not null
);

create table public.account_files (
  id text not null,
  user_id text not null references public.local_users (id),
  name text not null,
  type text not null,
  size integer not null,
  body bytea not null,
  primary key (user_id, id)
);

create table public.account_activity (
  id text primary key,
  user_id text not null references public.local_users (id),
  actor_id text not null references public.local_users (id),
  kind text not null,
  title text not null,
  at text not null,
  read_at text,
  before_value text,
  after_value text,
  reason text not null default ''
);
create index on public.account_activity (user_id, at desc);
create index on public.account_activity (actor_id);

create table public.account_notes (
  user_id text primary key references public.local_users (id),
  note text not null default ''
);

create table public.portal_content (
  path text primary key,
  document text not null,
  revision integer not null,
  updated_at text not null
);

create table public.portal_content_history (
  id text primary key,
  path text not null,
  actor_id text not null references public.local_users (id),
  at text not null,
  reason text not null,
  before_value text not null,
  after_value text not null
);
create index on public.portal_content_history (path, at desc);
create index on public.portal_content_history (actor_id);

create table public.portal_files (
  id text primary key,
  name text not null,
  type text not null,
  body bytea not null,
  size integer not null,
  actor_id text not null references public.local_users (id)
);
create index on public.portal_files (actor_id);

-- 하드 삭제 금지 (세션·로그인 시도 제외)
do $$
declare t text;
begin
  foreach t in array array['local_users','account_data','account_files','account_activity','account_notes',
    'portal_content','portal_content_history','portal_files'] loop
    execute format('create trigger %I before delete on public.%I for each row execute function public.prevent_hard_delete()', t || '_no_delete', t);
  end loop;
  -- 이력은 추가만
  execute 'create trigger portal_content_history_append_only before update or delete on public.portal_content_history for each row execute function public.reject_change()';
end $$;

-- Data API 차단: RLS 켜고 정책 없음 + 권한 회수 (서버 직접 접속 전용)
do $$
declare t text;
begin
  foreach t in array array['local_users','local_sessions','local_auth_attempts','account_data','account_files',
    'account_activity','account_notes','portal_content','portal_content_history','portal_files'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
