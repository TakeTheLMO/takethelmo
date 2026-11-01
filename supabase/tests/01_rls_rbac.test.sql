-- 실행: supabase start && supabase test db
-- 권한 상승 방지, 범위 격리, 감사로그 불변성, 하드 삭제 금지를 검증한다.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- ---------- 픽스처 (postgres 권한: auth.uid()가 null이라 신뢰된 서버 경로로 취급됨) ----------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'safety-a@test.local'),
  ('00000000-0000-0000-0000-000000000003', 'labmgr@test.local'),
  ('00000000-0000-0000-0000-000000000004', 'researcher@test.local'),
  ('00000000-0000-0000-0000-000000000005', 'inactive@test.local'),
  ('00000000-0000-0000-0000-000000000006', 'safety-b@test.local'),
  ('00000000-0000-0000-0000-000000000007', 'target-x@test.local'),
  ('00000000-0000-0000-0000-000000000008', 'target-y@test.local');

insert into public.organizations (id, code, name) values
  ('00000000-0000-0000-0000-0000000000a0', 'org-a', 'Org A'),
  ('00000000-0000-0000-0000-0000000000b0', 'org-b', 'Org B');

insert into public.labs (id, name, organization_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'Lab A1', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b1', 'Lab B1', '00000000-0000-0000-0000-0000000000b0');

update public.profiles set role = 'super_admin' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role = 'safety_admin', organization_id = '00000000-0000-0000-0000-0000000000a0'
  where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set role = 'lab_manager', organization_id = '00000000-0000-0000-0000-0000000000a0'
  where id = '00000000-0000-0000-0000-000000000003';
update public.profiles set organization_id = '00000000-0000-0000-0000-0000000000a0'
  where id in ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007');
update public.profiles set role = 'safety_admin', organization_id = '00000000-0000-0000-0000-0000000000b0'
  where id = '00000000-0000-0000-0000-000000000006';

insert into public.role_assignments (user_id, role, scope_type, scope_id) values
  ('00000000-0000-0000-0000-000000000002', 'safety_admin', 'organization', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-000000000006', 'safety_admin', 'organization', '00000000-0000-0000-0000-0000000000b0'),
  ('00000000-0000-0000-0000-000000000003', 'lab_manager',  'lab',          '00000000-0000-0000-0000-0000000000a1');

insert into public.lab_memberships (lab_id, user_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000005');
update public.profiles set status = 'inactive' where id = '00000000-0000-0000-0000-000000000005';

-- ---------- researcher ----------
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}', true); end $$;
set local role authenticated;

select throws_ok(
  $$ update public.profiles set role = 'safety_admin' where id = '00000000-0000-0000-0000-000000000004' $$,
  '42501', null, '일반 사용자는 자신의 권한을 올릴 수 없다');
select is((select count(*) from public.profiles), 1::bigint, '일반 사용자는 본인 프로필만 조회된다');
select is((select count(*) from public.audit_logs), 0::bigint, '일반 사용자는 감사로그를 조회할 수 없다');
select throws_ok(
  $$ insert into public.audit_logs (action) values ('forged') $$,
  '42501', null, '일반 사용자는 감사로그를 직접 쓸 수 없다');
reset role;

-- ---------- safety_admin (기관 A) ----------
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true); end $$;
set local role authenticated;

select throws_ok(
  $$ update public.profiles set role = 'safety_admin' where id = '00000000-0000-0000-0000-000000000004' $$,
  '42501', null, 'safety_admin은 safety_admin을 지정할 수 없다');
select lives_ok(
  $$ update public.profiles set role = 'lab_manager' where id = '00000000-0000-0000-0000-000000000007' $$,
  'safety_admin은 자기 기관 사용자를 lab_manager로 지정할 수 있다');
update public.profiles set role = 'researcher' where id = '00000000-0000-0000-0000-000000000001'; -- RLS로 0행
select ok((select count(*) from public.audit_logs where organization_id = '00000000-0000-0000-0000-0000000000a0') > 0,
  'safety_admin은 자기 기관의 감사로그를 조회한다');
select is((select count(*) from public.audit_logs where organization_id = '00000000-0000-0000-0000-0000000000b0'), 0::bigint,
  'safety_admin은 다른 기관의 감사로그를 조회할 수 없다');
reset role;

select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-000000000001'), 'super_admin',
  'safety_admin은 super_admin 계정을 변경할 수 없다');
select is((select actor_id from public.audit_logs
           where action = 'profile.role_change' and target_id = '00000000-0000-0000-0000-000000000007'),
  '00000000-0000-0000-0000-000000000002'::uuid, '권한 변경은 행위자와 함께 감사로그에 기록된다');

-- ---------- safety_admin (기관 B) / lab_manager / 비활성 ----------
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000006","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.labs where id = '00000000-0000-0000-0000-0000000000a1'), 0::bigint,
  '다른 기관 안전관리자는 이 기관의 연구실을 볼 수 없다');
reset role;

do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.labs), 1::bigint, 'lab_manager는 담당 연구실만 조회된다');
reset role;

do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.labs), 0::bigint, '비활성 계정은 소속 연구실도 조회할 수 없다');
reset role;

-- ---------- super_admin / 불변성 ----------
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true); end $$;
set local role authenticated;
select lives_ok(
  $$ update public.profiles set role = 'safety_admin' where id = '00000000-0000-0000-0000-000000000008' $$,
  'super_admin은 safety_admin을 지정할 수 있다');
reset role;

select throws_ok($$ truncate public.audit_logs $$, '42501', null, '감사로그는 비우기도 막힌다');
select throws_ok($$ delete from public.labs where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, '연구실은 하드 삭제할 수 없다');

select * from finish();
rollback;
