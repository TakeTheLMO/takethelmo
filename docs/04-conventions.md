# 04. 구조와 코딩 규칙

## 폴더 구조
```
app/
  layout.tsx                 루트 (html, 메타데이터)
  icon.svg                   파비콘
  (site)/                    일반 사이트: Header + Footer
    layout.tsx
    page.tsx                 홈
    [...slug]/page.tsx       메뉴에 있지만 아직 없는 페이지 → 준비 중
    not-found.tsx
    login/ forgot-password/ reset-password/ forbidden/ privacy/ terms/
    <그룹>/<페이지>/page.tsx  ← 실제 기능 페이지는 여기에 추가
  (admin)/admin/             관리자: 별도 레이아웃 + 사이드바
    layout.tsx  page.tsx  audit-logs/  [...slug]/
  auth/callback  auth/signout
components/
  layout/   Header, Footer, Logo, PageHeader, SectionLayout
  ui/       Button, Card, Container, EmptyState, ComingSoon
  admin/    AdminSidebar, AuditLogTable
config/     navigation(메뉴) · admin-navigation(관리자 메뉴+권한) · roles(역할·표시명) · site(브랜드·푸터)
features/   <모듈>/ — 기능별 코드 (아래 참고)
lib/        supabase/(client·server·admin·middleware·env) · auth/(session·guards·permissions) · audit.ts
types/      공통 타입
supabase/   migrations/ (0001, 0002, ...) · tests/ (pgTAP)
e2e/        Playwright
docs/       명세
```

## features 모듈 구조 (예: `features/notices`)
```
features/notices/
  schema.ts       입력 검증 (타입 + 검증 함수)
  queries.ts      서버 전용 조회 ("server-only"), Supabase server client 사용 → RLS 적용됨
  actions.ts      "use server" 액션. 첫 줄에서 requireRole / requireUser
  components/     NoticeList.tsx, NoticeForm.tsx ...
  *.test.ts       단위 테스트
```
`app/**/page.tsx` 는 가드 호출 + queries 호출 + 컴포넌트 배치만 한다.

## 권한 3중 검사
| 층 | 무엇을 | 코드 |
|---|---|---|
| ① middleware | `/admin` 등 보호 경로의 로그인 여부 | `lib/supabase/middleware.ts`, `config/roles.ts` 의 `PROTECTED_PREFIXES` |
| ② 서버 | 역할 검사 (페이지·액션·라우트마다) | `requireUser()`, `requireRole(roles, path)` |
| ③ DB | 행 단위 범위 검사 | RLS 정책 + `can_access_lab()`, `can_manage_lab()`, `can_manage_facility()`, `is_org_admin()` ... |

UI 에서 버튼 숨김은 `lib/auth/permissions.ts` 로 하되, 이것은 편의일 뿐 보안이 아니다.

## Server Action 템플릿
```ts
"use server";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PRIVILEGED_ROLES } from "@/config/roles";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function createNotice(input: { title: string; body: string }): Promise<ActionResult> {
  await requireRole(PRIVILEGED_ROLES, "/admin/notices");          // ② 서버 검사
  const title = input.title.trim();
  if (!title) return { ok: false, message: "제목을 입력해 주세요." };
  try {
    const supabase = await createClient();                          // 사용자 세션 → ③ RLS 적용
    const { error } = await supabase.from("notices").insert({ title, body: input.body });
    if (error) return { ok: false, message: "저장하지 못했습니다." };
    return { ok: true };
  } catch {
    return { ok: false, message: "일시적인 오류가 발생했습니다." };
  }
}
```
- 사용자 데이터는 **service_role(admin client)이 아니라 사용자 세션 client** 로 쓴다. 그래야 RLS 가 적용된다.
- 클라이언트 폼은 `try/finally` 로 로딩 상태를 항상 해제한다 (`LoginForm.tsx` 참고).

## 마이그레이션 템플릿 (`supabase/migrations/0003_<이름>.sql`)
```sql
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null default '',
  is_pinned boolean not null default false,
  published_at timestamptz,
  status public.record_status not null default 'active',
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notices_org_published_idx on public.notices (organization_id, published_at desc) where status = 'active';

-- 생성자/수정자 자동 입력 + 하드 삭제 금지 + 감사로그 자동 기록
select public.attach_standard_triggers('public.notices');

-- GRANT: 기본 회수 후 필요한 것만 (DELETE 는 절대 부여하지 않음)
revoke all on public.notices from anon, authenticated;
grant select, insert, update on public.notices to authenticated;

-- RLS: 기본 거부에서 시작
alter table public.notices enable row level security;
create policy notices_select on public.notices for select to authenticated
  using (public.is_active_user() and status = 'active' and public.is_in_org(organization_id));
create policy notices_insert on public.notices for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy notices_update on public.notices for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
```
- 같은 커밋에 `supabase/tests/0x_<이름>.test.sql` 로 "다른 기관 사용자는 못 본다 / researcher 는 못 쓴다" 테스트를 추가한다.
- 공개(비로그인) 조회가 필요한 테이블은 `anon` 용 select 정책을 별도로, 최소 컬럼만 노출하는 view 로 만든다.

## 이름 규칙
- 테이블: 복수형 snake_case (`training_records`) / 컬럼: snake_case / 상태: `status` (record_status) 또는 업무 상태 `workflow_status`
- 경로: kebab-case (`/safety/corrective-actions`) / 컴포넌트: PascalCase 파일 / 함수: camelCase
- 화면 문구: 한국어, 존댓말("~해 주세요"), 오류 메시지는 원인 + 다음 행동
