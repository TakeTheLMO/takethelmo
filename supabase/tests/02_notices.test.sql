-- 실행: supabase start && supabase test db
-- 공지사항: 기관 격리, 임시저장·게시중단 비공개, 작성 권한, 삭제 금지, 감사로그
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- ---------- 픽스처 ----------
insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'n-safety-a@test.local'),
  ('10000000-0000-0000-0000-000000000002', 'n-researcher-a@test.local'),
  ('10000000-0000-0000-0000-000000000003', 'n-researcher-b@test.local');

insert into public.organizations (id, code, name) values
  ('10000000-0000-0000-0000-0000000000a0', 'n-org-a', 'Notice Org A'),
  ('10000000-0000-0000-0000-0000000000b0', 'n-org-b', 'Notice Org B');

update public.profiles set role = 'safety_admin', organization_id = '10000000-0000-0000-0000-0000000000a0'
  where id = '10000000-0000-0000-0000-000000000001';
update public.profiles set organization_id = '10000000-0000-0000-0000-0000000000a0'
  where id = '10000000-0000-0000-0000-000000000002';
update public.profiles set organization_id = '10000000-0000-0000-0000-0000000000b0'
  where id = '10000000-0000-0000-0000-000000000003';
insert into public.role_assignments (user_id, role, scope_type, scope_id) values
  ('10000000-0000-0000-0000-000000000001', 'safety_admin', 'organization', '10000000-0000-0000-0000-0000000000a0');

insert into public.notices (id, organization_id, title, body, published_at, status) values
  ('10000000-0000-0000-0000-00000000aa01', '10000000-0000-0000-0000-0000000000a0', '게시', '본문', now() - interval '1 day', 'active'),
  ('10000000-0000-0000-0000-00000000aa02', '10000000-0000-0000-0000-0000000000a0', '임시저장', '본문', null, 'active'),
  ('10000000-0000-0000-0000-00000000aa03', '10000000-0000-0000-0000-0000000000a0', '게시중단', '본문', now() - interval '1 day', 'inactive');

-- ---------- researcher (기관 A) ----------
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true); end $$;
set local role authenticated;

select is((select count(*) from public.notices), 1::bigint, 'researcher는 게시 중인 공지만 조회한다');
select is((select count(*) from public.notices where id = '10000000-0000-0000-0000-00000000aa02'), 0::bigint,
  'researcher는 임시저장 공지를 조회할 수 없다');
select is((select count(*) from public.notices where id = '10000000-0000-0000-0000-00000000aa03'), 0::bigint,
  'researcher는 게시중단 공지를 조회할 수 없다');
select throws_ok(
  $$ insert into public.notices (organization_id, title, body) values ('10000000-0000-0000-0000-0000000000a0', 'x', 'y') $$,
  '42501', null, 'researcher는 공지를 작성할 수 없다');
update public.notices set title = '변조' where id = '10000000-0000-0000-0000-00000000aa01'; -- RLS로 0행
reset role;

select is((select title from public.notices where id = '10000000-0000-0000-0000-00000000aa01'), '게시',
  'researcher는 공지를 수정할 수 없다');

-- ---------- researcher (기관 B) ----------
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.notices), 0::bigint, '다른 기관 사용자는 공지를 조회할 수 없다');
reset role;

-- ---------- safety_admin (기관 A) ----------
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true); end $$;
set local role authenticated;

select is((select count(*) from public.notices), 3::bigint, 'safety_admin은 임시저장·게시중단 공지도 조회한다');
select lives_ok(
  $$ insert into public.notices (organization_id, title, body) values ('10000000-0000-0000-0000-0000000000a0', '새 공지', '본문') $$,
  'safety_admin은 자기 기관 공지를 작성할 수 있다');
select throws_ok(
  $$ insert into public.notices (organization_id, title, body) values ('10000000-0000-0000-0000-0000000000b0', '남의 공지', '본문') $$,
  '42501', null, 'safety_admin은 다른 기관 공지를 작성할 수 없다');
select throws_ok(
  $$ delete from public.notices where id = '10000000-0000-0000-0000-00000000aa01' $$,
  '42501', null, '공지는 삭제할 수 없다');
reset role;

select ok(exists (select 1 from public.audit_logs
                  where action = 'notices.insert' and actor_id = '10000000-0000-0000-0000-000000000001'),
  '공지 작성은 행위자와 함께 감사로그에 기록된다');

select * from finish();
rollback;
