# AGENTS.md — AI 작업 지침 (taketheLMO)

이 파일은 이 저장소에서 작업하는 AI(Claude, Codex, Cursor 등)가 **가장 먼저 읽는 문서**다.
사람에게 설명하는 문서는 `README.md`, 상세 명세는 `docs/` 에 있다.

## 0. 작업 시작 전에 읽을 것 (순서대로)
1. `docs/02-current-status.md` — 지금 무엇이 되어 있고 무엇이 안 되어 있는지
2. `docs/03-roadmap.md` — 이번 작업이 몇 단계에 속하는지, 완료 기준
3. 이번에 만들 페이지의 명세 `docs/pages/<페이지>.md` (없으면 `docs/pages/_TEMPLATE.md` 로 먼저 작성)
4. `docs/04-conventions.md` — 폴더 구조, 권한, DB 규칙

전체 제품 명세는 `docs/01-product-spec.md`. 원본 요구사항은 `docs/original-specs/`.

## 1. 명령어
```bash
npm install          # 최초 1회. package-lock.json 은 커밋한다
npm run dev          # http://localhost:3000
npm run lint && npm run typecheck && npm test   # 작업 끝나면 반드시 통과
npm run build        # 배포 전 확인
npm run test:e2e     # build 후 실행 (Playwright)
```

## 2. 절대 규칙 (어기면 안 됨)
1. **권한 검사는 3중**: middleware(로그인) + 각 `page.tsx`·Server Action·Route Handler 의 `requireRole()` + PostgreSQL RLS.
   (Supabase 기준. 포털 계정(SQLite) 화면의 3중 검사는 2-1 절 참고)
   레이아웃의 검사만 믿지 말 것. 새 관리자 페이지/액션에는 반드시 `requireRole()` 를 첫 줄에 둔다.
2. **fail closed**: 환경변수 누락·인증 오류·프로필 없음·비활성 계정은 항상 "비로그인"으로 취급한다.
3. **`SUPABASE_SERVICE_ROLE_KEY` 는 서버 전용**. `lib/supabase/admin.ts` 로만 쓰고, `"use client"` 파일에서 import 금지.
4. **하드 삭제 금지**. `status` 를 `inactive`/`closed`/`archived` 로 바꾼다. DB 트리거가 DELETE 를 막는다.
5. **새 테이블** = 마이그레이션 파일 하나에 `create table` + `attach_standard_triggers()` + RLS 정책 + GRANT 를 함께 쓴다.
   기존 마이그레이션 파일은 수정하지 말고 새 번호(`0003_...sql`)로 추가한다.
6. **허위 데이터 금지**. DB 에 저장되지 않는 기능을 완성된 것처럼 보이게 하지 않는다. 데이터가 없으면 `EmptyState`, 기능이 없으면 `ComingSoon`.
7. **법적 상태 표시 주의**: LMO 신고·허가 등은 실제 완료 기록이 있을 때만 "완료"로 표시한다.
8. **감사로그에 비밀번호·토큰·이메일 원문을 넣지 않는다**. 필요하면 해시(`sha256`)만.
9. 권한 규칙을 바꾸면 `lib/auth/permissions.ts` 와 DB 함수(`guard_profile_change` 등)를 **함께** 고치고 테스트를 추가한다.

## 2-1. 인증 체계는 두 개다 (D-15) — 새 기능은 어느 쪽인지 먼저 정한다
| | **포털 계정 (SQLite / 배포: Postgres)** | **기관 계정 (Supabase)** |
|---|---|---|
| 용도 | 프로토타입 업무 포털: `/portal`, `/mypage`, 안전·연구실·교육·LMO·자료실 업무 화면, `/management/*` | 기관 운영 기능: `/admin/*`, `/community/notices`, `/institution-login` |
| 로그인 | `/login`, `/signup` (공개 가입, 역할 선택) | `/institution-login` (초대 전용, D-02) |
| 코드 | `features/local-auth/`, `features/user-management/`, `features/portal-content/`, `features/demo/`, `features/workspace/`, `app/api/{prototype-auth,account-*,portal-content}` | `lib/auth/`, `lib/supabase/`, `features/notices/`, `supabase/migrations/` |
| ① 1차 | middleware: `config/workspace.ts` 경로에 세션 쿠키가 있는지 | middleware: `PROTECTED_PREFIXES` 로그인 여부 |
| ② 서버 | 페이지 `requireLocalUser()` (`WorkPage`), API `accountAccess()` — DB 세션·활성 상태 검증 | `requireRole()` / `requireUser()` |
| ③ 데이터 | Store 메서드 첫 줄 `this.admin(actor)` 또는 `actor === user` 검사 | RLS + 트리거 |
| 관리자 판단 | **활성 `username='admin'` 계정만** (`canSwitchRole`, `AccountDataStore.admin()`). role 값은 서버 권한이 아님 | role (`lib/auth/permissions.ts`) |

규칙:
- 새 기능은 **지금 그 기능이 붙어 있는 화면의 체계**를 따른다. 포털 업무 화면 확장 = SQLite, 기관 운영·관리자(`/admin`) = Supabase. 애매하면 사람에게 묻는다.
- 한 기능에서 두 체계를 섞지 않는다 (SQLite 사용자로 Supabase 데이터를 읽거나 그 반대 금지).
- 포털 쪽에 새 API·Store 메서드를 추가할 때도 ②·③ 을 생략하지 않는다: API 는 `accountAccess(request, write)` 로 시작하고, 타인 데이터에 닿는 Store 메서드는 첫 줄에서 `this.admin(actor)` 를 호출한다. 쓰기 요청은 Origin 검사(`accountAccess(..., true)`)를 거친다.
- 포털의 역할(연구실 안전담당자 등)은 현재 화면 흐름용이며 서버 권한 경계가 아니다. 역할로 서버 권한을 나누려면 먼저 결정 기록을 추가한다.
- 역할 표시명은 `config/roles.ts` 의 `ROLE_LABELS` 한 곳만 고친다 (`accountRoles` 는 이를 재사용, D-14).
- 포털 저장소는 `features/local-auth/sql.ts` 의 비동기 `Sql` 인터페이스 하나로 접근한다. `PORTAL_DATABASE_URL` 이 있으면 Supabase Postgres(`0004_portal_store.sql`), 없으면 로컬 SQLite(`data/*.sqlite`). SQL 은 두 DB 공통 문법만 쓴다(`?` 자리표시자, `ON CONFLICT`, 별칭은 `AS "camelCase"`). 쓰기 묶음은 `db.tx(lockKey, fn)` 안에서 한다.
- 포털 테이블은 Data API(anon/authenticated)로 접근할 수 없다(RLS 정책 없음 + 권한 회수). 서버만 직접 접속한다. `PORTAL_DATABASE_URL` 은 서버 전용 비밀값이다.
- 기본 `admin/admin` 계정은 로컬 SQLite 전용이다. Postgres(배포)에서는 `PORTAL_ADMIN_PASSWORD`(12자 이상)가 있을 때만 admin 을 최초 1회 만든다. Vercel 에서 `PORTAL_DATABASE_URL` 이 없으면 저장소를 열지 않는다(fail closed).

## 3. 새 페이지 추가 방법 (일반 사이트)
1. 메뉴에 이미 있으면(`config/navigation.ts`) 지금은 `app/(site)/[...slug]/page.tsx` 가 "준비 중"으로 보여주고 있다.
2. 실제 경로에 `app/(site)/<그룹>/<페이지>/page.tsx` 를 만들면 그 파일이 우선한다.
3. 페이지는 `SectionLayout` 으로 감싸 디자인을 통일한다:
   ```tsx
   import { SectionLayout } from "@/components/layout/SectionLayout";
   import { findNavContext } from "@/config/navigation";

   export default async function Page() {
     const ctx = findNavContext("/community/notices")!;
     return (
       <SectionLayout group={ctx.group} currentHref="/community/notices" title={ctx.item!.label} description={ctx.item!.description}>
         {/* features/community/... 의 컴포넌트 */}
       </SectionLayout>
     );
   }
   ```
4. 데이터 조회·저장 로직은 `features/<모듈>/` 에 둔다 (`queries.ts`, `actions.ts`, `components/`, `schema.ts`). `app/` 은 얇게 유지.
5. 로그인이 필요한 페이지면 `requireUser()` / `requireRole()` 를 호출한다.
6. `e2e/` 에 최소 1개 테스트 추가, `docs/02-current-status.md` 갱신.

## 4. 새 관리자 페이지 추가 방법
1. `config/admin-navigation.ts` 에 항목과 `roles` 가 있는지 확인.
2. `app/(admin)/admin/<경로>/page.tsx` 생성, 첫 줄에서 `requireRole(<그 항목의 roles>, "<경로>")`.
3. 목록/수정은 RLS 가 막는 데이터가 화면에 안 나오는지 확인 (다른 기관 계정으로 테스트).

## 5. 디자인 규칙
- 색: `brand-*` (짙은 녹색, `tailwind.config.ts`) + gray. 임의의 hex 색 사용 금지.
- 공통 컴포넌트 우선: `components/ui/` (Button, ButtonLink, Card, Container, EmptyState, ComingSoon), `components/layout/` (Header, Footer, Logo, PageHeader, SectionLayout).
- 같은 UI 가 2번 이상 나오면 `components/ui/` 로 올린다.
- 반응형: 모바일 우선, `lg:` 에서 데스크톱 내비게이션. 접근성: 아이콘에 `aria-hidden`, 폼 요소에 label.
- 과한 애니메이션·장식 금지.

## 6. 하지 말 것
- 한 번에 여러 모듈 구현 (한 작업 = 한 페이지 또는 한 기능)
- `middleware.ts` 만으로 권한 처리
- 클라이언트 컴포넌트에서 Supabase 로 관리자 데이터를 직접 조회
- 기존 마이그레이션 수정, `audit_logs` 수정/삭제
- 확인되지 않은 법령 문구·기관 정보·연락처를 지어내서 넣기
- `"use server"` 파일에서 async 함수 외의 값(상수·객체)을 export (빌드 실패). 타입 export 는 허용. 공유 상수는 `lib/` 에 둔다
