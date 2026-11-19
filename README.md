# taketheLMO

연구실 안전관리와 LMO 업무를 포털에서 처리하는 Next.js 웹앱입니다. **시작 화면은 `/portal`**, 로그인은 `/login`, 회원가입은 `/signup`입니다. 기존 계정·SQLite DB·첨부 원본을 그대로 사용합니다.

## 포털 업무 페이지 (2026-11-17)

- `/mypage`: 나의 업무 현황, `/mypage/requests`: 신청·IBC 사전 문의, `/mypage/notifications`: 업무 알림
- `/safety/inspections`, `/safety/incidents`: 점검·개선조치·사고 기록
- `/training/courses`: 교육과정 추가와 이수증 등록, `/labs`: 연구실 정보·구성원
- `/lmo/assessment`, `/lmo/ledger`: 확인 목록·문의 연결, 수량 기록·CSV·정정 이력
- `/library/manuals`, `/support/search`, `/support/guides`, `/support/assistant`: 첨부 자료·참고 서식·검색·가이드·규칙 기반 안내
- `/management/users`: admin 전용 사용자 검색·계정 수정·자료 열람·검토/승인·답변·첨부 다운로드·이력·참조 메모
- 사용자별/전체 자료를 카테고리·처리 상태·첨부 여부로 조회하고, 첨부에서 연결된 업무 기록으로 바로 이동합니다. 연구실 정보·교육과정·현재 LMO 확인 응답도 정정할 수 있습니다.
- `/management/menus`: 전체 메뉴별 사용자 업무 자료 조회, 페이지 제목·설명·안내 수정, 공지·서식·매뉴얼·링크·공통 첨부 작성/게시/보관. 게시 자료는 해당 메뉴와 통합 검색에 표시됩니다. 변경 사유·이력·동시 수정 충돌 검사를 적용합니다.

`/demo/*`와 `/prototype-login`의 기존 주소는 대응하는 업무 페이지로 이동합니다. 체험용 화면과 역할 전환을 기본 업무 화면에서 제거했습니다. 새 계정은 빈 자료로 시작하며 기존 실제 입력 자료와 `[예시]` 계정은 유지합니다. IBC 답변 완료는 심의 승인·실험 시작 허가를 의미하지 않으며 AI 모델은 연결되지 않았습니다.

계정과 업무 데이터는 현재 Node 서버의 SQLite에 저장합니다. 기존 Supabase 기관 관리 기능은 `/institution-login`에서 별도로 연결합니다. 포털 UI 이관이 기관 SSO·법정 신고·AI 연동의 완료를 뜻하지 않습니다.

## 실행

```powershell
npm ci
npm run dev
```

관리자 로그인은 `admin` / `admin`입니다. 예시 사용자·자료는 `npm run seed:examples`로 추가합니다. 파일과 계정 DB는 Git에 포함되지 않습니다. 자세한 범위는 [포털 통합 명세](docs/pages/portal-integration.md)를 참고하세요.

---

아래는 기존 프로젝트 구성 및 이전 구현 이력입니다. 경로·동작은 위 포털 통합 명세를 우선합니다.

# taketheLMO Prototype

연구실·LMO 안전관리 업무를 브라우저에서 체험하는 프로토타입입니다. Next.js App Router, TypeScript, Tailwind CSS로 구현했으며, 데모는 Supabase나 API 키 없이 실행할 수 있습니다.

이 저장소는 [TakeTheLMO/takethelmo](https://github.com/TakeTheLMO/takethelmo)의 `demo` 브랜치 기반 프로젝트에 추가한 프론트엔드 체험 기능을 포함한 2026년 11월 16일 작업본입니다. 원본 프로젝트의 기존 코드와 문서를 함께 보존한 별도 공개 저장소이며, 실제 기관 운영 시스템이나 공식 신고 서비스가 아닙니다.

> **AI 로 개발을 이어갈 때**: `AGENTS.md` → `docs/02-current-status.md` → `docs/03-roadmap.md` 순서로 읽게 한다. 명세 모음은 `docs/README.md`.
> 변경 내역은 `CHANGELOG.md`.

## 로컬 계정 로그인 (2026-11-17)

`/signup`에서 이름·이메일·비밀번호·업무 역할로 가입하고 `/login`에서 로그인합니다. 포털은 공개이며 실제 업무 자료는 로그인이 필요합니다. Supabase 기관 인증은 `/institution-login`에서 별도로 사용합니다.

- 관리자 아이디와 비밀번호는 `admin / admin`입니다. 최초 인증 시 생성하며 기존 비밀번호·비활성 상태는 덮어쓰지 않습니다.
- 가입은 일반 연구원·연구실 안전담당자·LMO 담당자·기관 안전관리자 중 하나를 선택합니다. 직책 중복 선택과 체험 역할 전환은 없습니다. `super_admin` 신규 가입과 예시 전용 이메일 가입은 서버에서도 거부합니다.
- 다른 사용자 관리 권한은 활성 admin 아이디로만 판정합니다. 비관리자의 업무 역할이나 기존 `super_admin` 표시는 관리자 권한을 부여하지 않습니다.
- Node.js **22.13 이상** 필요. 로컬 DB는 `data/local-auth.sqlite`이며 `LOCAL_AUTH_DB_PATH`로 지정할 수 있습니다. 배포(Vercel)에서는 파일을 쓸 수 없으므로 `PORTAL_DATABASE_URL`(Supabase Postgres, `supabase/migrations/0004_portal_store.sql`)을 설정해야 합니다. 비밀번호는 salt/scrypt 해시, 세션은 HttpOnly 쿠키와 DB 토큰 해시를 사용합니다. DB는 Git에서 제외합니다.
- 업무 기록과 첨부 원본은 계정별 SQLite에 저장합니다. `/management/users`에서 사용자·카테고리별 등록 자료, 파일, 이력, 알림을 관리하고 `/management/menus`에서 메뉴 안내·공통 자료를 관리합니다.
- 저장 충돌은 원본을 덮어쓰지 않고 처리합니다. 독립 문의 초안은 최신 상태에 다시 저장하며, 같은 기록의 충돌은 시각별 복구 사본으로 보관합니다.
- 일상점검 달력·포털 관리자 확인·월간 CSV, 대장 보관위치·용기당 용량·검색/정정은 [일상점검 명세](docs/pages/daily-inspections.md)를 참고하세요. 전체 채팅 요구사항과 남은 범위는 [점검 결과](docs/2026-11-17-requirements-review.md)에 정리했습니다.
- 기존 `/demo/*`와 `/prototype-login`은 포털 업무 주소로 이동합니다. 이전 프론트엔드 체험 버전의 명세는 기록용으로 보존합니다.
- 지속 가능한 디스크가 있는 Node 서버를 전제로 합니다. 임시 파일 시스템의 서버리스 배포에는 외부 DB 전환이 필요합니다. 비밀번호 자동 메일 재설정은 미제공입니다.

아래 Supabase 설정·RLS·기관 관리자 설명은 별도 기관 인증 영역에 해당합니다.

## Supabase 설정
1. 프로젝트 생성 후 `supabase/migrations/0001` ~ `0003` 을 순서대로 실행 (또는 `supabase link` 후 `supabase db push`)
2. Authentication > Sign In / Providers: **"Allow new users to sign up" 끄기** (초대 전용), Email 켜기, Confirm email 켜기
3. Authentication > URL Configuration: Site URL 과 Redirect URLs 에 `<사이트주소>/auth/callback` 등록
4. Authentication > Email Templates (Invite / Reset password / Confirm signup) 링크를 token_hash 방식으로 바꾸면 메일 앱의 링크 미리보기 때문에 토큰이 소모되는 문제를 줄일 수 있다: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/reset-password?mode=invite` (recovery/email 도 같은 형태)
5. 첫 기관과 super_admin 만들기 (SQL Editor, 신뢰된 경로):
```sql
insert into public.organizations (code, name) values ('main', '기관명');
update public.profiles set role = 'super_admin' where email = '내 이메일';
```

## 로컬 데모 데이터
Docker 실행 후 `npx supabase start` → `npx supabase db reset` 하면 마이그레이션 뒤에 `supabase/seed.sql` 이 자동으로 들어간다.
`.env.local` 에는 `npx supabase status` 의 API URL·anon key 를 넣는다.

- 가상 기관 2곳(데모대학교, 데모연구원), 부서·건물·호실·연구실·구성원·LMO 시설·범위 역할, 공지 22건(데모대학교 구성원에게 보이는 것 19건 + 임시저장·게시중단·다른 기관 각 1건)
- 계정은 비밀번호가 모두 `demo1234!` 이다: `super@` · `safety@` · `labmgr@` · `lmo@` · `researcher@` · `safety-b@` · `researcher-b@` + `example.com`
- **운영 DB 에는 넣지 않는다** (알려진 비밀번호). `supabase db push` 는 seed 를 실행하지 않으니 `--include-seed` 를 쓰지 말 것.

## 권한 모델
- `profiles.role`: 계정의 기본 역할. 변경 규칙은 DB 트리거(`guard_profile_change`)가 강제한다.
  - super_admin 지정·해제: super_admin 만 / safety_admin 은 일반·lab_manager·lmo_manager 만 관리 / 본인 권한 변경 불가 / 마지막 super_admin 보호
- `role_assignments`: safety_admin·lab_manager·lmo_manager 의 **범위**(전역·기관·부서·연구실·LMO시설). 데이터 접근은 역할 + 범위 + 소속(`lab_memberships`)으로 결정된다.
- 비활성(`status <> 'active'`) 계정은 모든 RLS 검사에서 탈락한다.
- 검사 위치는 3중이다: ① middleware(로그인 여부) ② 각 `page.tsx`/Server Action/Route 의 `requireRole()` ③ PostgreSQL RLS·트리거.
  **새 관리자 페이지·액션을 만들 때 ②를 빼먹지 말 것** (레이아웃 검사만으로는 클라이언트 이동 시 재실행되지 않는다).

## 감사로그
- DB 변경은 트리거(`attach_standard_triggers`)가 자동 기록: 행위자·역할·작업·변경 전/후·요청 ID. 이메일·이름 등은 제외 목록으로 뺀다.
- 로그인·로그아웃·비밀번호 변경 등은 서버에서 `logAuditEvent()` 로 기록 (service_role 전용 함수 `write_audit_log`).
- `audit_logs` 는 UPDATE/DELETE/TRUNCATE 가 트리거로 막혀 있고 API 쓰기 권한이 없다.
- **새 테이블을 만들 때**: 마이그레이션에서 `select public.attach_standard_triggers('public.테이블');` 와 RLS 정책, GRANT 를 함께 작성한다. 하드 삭제는 막혀 있으므로 `status` 로 비활성화/폐쇄한다. 계정도 삭제하지 말고 비활성화한다.

## 테스트
- `npm test` 단위 테스트(권한 규칙, 리다이렉트 검증) / `npm run test:e2e` Playwright (보호 경로) / `supabase test db` RLS(pgTAP)
- GitHub Actions: `.github/workflows/ci.yml` (lint, typecheck, test, npm audit, build, e2e, RLS)
- `supabase/config.toml` 이 없으면 `supabase init` 후 커밋

## Vercel 배포
GitHub push → Vercel Import → Node.js 22.x 로 설정 → Environment Variables 는 Production / Preview 를 분리해서 등록 (Preview 에는 별도 Supabase 프로젝트 권장). `SUPABASE_SERVICE_ROLE_KEY` 는 서버 전용.
Next.js 는 보안 패치가 자주 나온다. 배포 전 `npm audit`, `npm outdated next react` 를 확인한다.

## 구조
`config/` 메뉴·역할 · `app/(site)` 일반 사이트 · `app/(admin)/admin` 관리자(별도 레이아웃) · `app/auth` 콜백·로그아웃 ·
`components/layout` Header·Footer·Logo·PageHeader·SectionLayout · `components/ui` 공통 UI ·
`lib/auth` 세션·가드·권한 규칙 · `lib/supabase` 클라이언트 · `lib/audit.ts` · `supabase/migrations|tests` · `features/*` 기능 모듈 · `docs/` 명세
자세한 규칙과 코드 템플릿: `docs/04-conventions.md`

## 메뉴·페이지 추가
- 메뉴는 `config/navigation.ts` 한 곳만 고치면 Header, 모바일 메뉴, 섹션 메뉴, Footer, 준비 중 페이지에 반영된다.
- 실제 페이지는 `app/(site)/<그룹>/<페이지>/page.tsx` 를 만들고 `SectionLayout` 으로 감싼다. 명세는 `docs/pages/_TEMPLATE.md` 로 먼저 작성.

## Windows 에서
- Node.js 22 LTS 설치 → PowerShell 에서 `npm install`. 줄바꿈은 `.gitattributes` 로 LF 고정.
- VS Code 권장 확장은 `.vscode/extensions.json` 에 있다.

## 아직 구현되지 않은 것 (최신 현황: `docs/02-current-status.md`)
관리자 MFA(가드에 TODO 표시), 사용자·권한 관리 화면(DB 규칙과 `lib/admin/invite.ts` 만 있음), 개인정보처리방침 본문, 파일 업로드/Storage 정책,
승인 워크플로우·알림·통합 검색, 연구실~LMO 업무 기능, CSP 헤더, 오류 모니터링, 백업·복구 절차.

## 관리자 화면 예시 데이터

`npm run seed:examples`로 `[예시]` 사용자 6명, 등록 자료 18건, 첨부 7개를 추가합니다. 기존 계정과 자료는 덮어쓰지 않으며 재실행 시 이미 있는 예시는 건너뜁니다. 실행 전 SQLite 백업을 생성합니다.

예시 로그인: `sample.researcher1@example.test` / `Demo1234!`. 모든 예시 계정의 비밀번호는 동일하며 `sample.inactive@example.test`는 비활성 상태입니다. 가상 인물·자료로, 실제 교육 이수·신고·승인을 의미하지 않습니다. `/demo/users`와 `/demo/notifications`에서 확인합니다.
