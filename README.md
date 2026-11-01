# taketheLMO

연구실 안전관리 통합 플랫폼 (Next.js App Router + TypeScript + Tailwind + Supabase + Vercel)

> **AI 로 개발을 이어갈 때**: `AGENTS.md` → `docs/02-current-status.md` → `docs/03-roadmap.md` 순서로 읽게 한다. 명세 모음은 `docs/README.md`.
> 변경 내역은 `CHANGELOG.md`.

## 시작하기
```bash
npm install            # package-lock.json 이 생성된다. 반드시 커밋할 것 (CI는 npm ci 사용)
cp .env.example .env.local
npm run dev            # http://localhost:3000
npm run lint && npm run typecheck && npm test
```
Supabase 값이 없어도 홈과 모든 공개 메뉴는 열린다. 로그인과 `/admin` 은 환경변수가 없으면 **열리지 않는다**(fail closed).

## Supabase 설정
1. 프로젝트 생성 후 `supabase/migrations/0001`, `0002` 를 순서대로 실행 (또는 `supabase link` 후 `supabase db push`)
2. Authentication > Sign In / Providers: **"Allow new users to sign up" 끄기** (초대 전용), Email 켜기, Confirm email 켜기
3. Authentication > URL Configuration: Site URL 과 Redirect URLs 에 `<사이트주소>/auth/callback` 등록
4. Authentication > Email Templates (Invite / Reset password / Confirm signup) 링크를 token_hash 방식으로 바꾸면 메일 앱의 링크 미리보기 때문에 토큰이 소모되는 문제를 줄일 수 있다: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/reset-password?mode=invite` (recovery/email 도 같은 형태)
5. 첫 기관과 super_admin 만들기 (SQL Editor, 신뢰된 경로):
```sql
insert into public.organizations (code, name) values ('main', '기관명');
update public.profiles set role = 'super_admin' where email = '내 이메일';
```

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
