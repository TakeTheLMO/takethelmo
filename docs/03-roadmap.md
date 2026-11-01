# 03. 로드맵

> 한 단계 안에서도 **한 번에 한 기능**씩. 각 단계는 "완료 기준"을 모두 만족해야 끝난 것으로 본다.
> 공통 완료 기준: lint · typecheck · test 통과, 해당 기능 E2E 1개 이상, RLS 테스트(테이블 추가 시), `02-current-status.md` 갱신.

## ✅ 0단계 — 기반 (v0.1 ~ v0.3)
프로젝트 구조, 디자인 시스템, Header/Footer/SectionLayout, 로고, 로그인·콜백·재설정, RBAC+RLS, 감사로그, CI.

## 1단계 — 첫 실행·배포 확인  ← **다음 작업**
1. `npm install` → `package-lock.json` 커밋
2. `npm run lint && npm run typecheck && npm test && npm run build` 통과 (v0.3.0 변경분 첫 검증)
3. Supabase 프로젝트 생성, 0001·0002 적용, 초대 전용 설정, 첫 super_admin 지정 (README 참고)
4. `supabase init` → `config.toml` 커밋, `supabase test db` 통과
5. GitHub push → Vercel 연결, Preview/Production 환경변수 분리
6. `config/site.ts` 운영기관·부서·문의처 입력
- 완료 기준: Vercel 주소에서 로그인 → `/admin` 진입 → 감사로그에 로그인 기록 확인

## 2단계 — 사용자·권한 관리 화면
`/admin/users` (목록·초대·비활성화), `/admin/roles` (범위 역할 부여·해제), 관리자 MFA(TOTP)
- 명세: `pages/admin-users.md` (작성 필요)
- 완료 기준: safety_admin 이 safety_admin 을 지정하려 하면 UI·서버·DB 모두에서 거부

## 3단계 — 공지사항 · 자료실 (첫 CRUD + 파일)
- 공지사항: `pages/community-notices.md` ← 명세 작성됨
- 자료실: documents + attachments + 비공개 Storage + Signed URL
- 홈의 "최신 공지사항", "최근 등록 자료" 실제 데이터로 교체
- 완료 기준: 파일은 권한 있는 사용자만 다운로드, 삭제는 status 변경

## 4단계 — 연구실 관리
연구실 목록/상세(`/labs/[id]`), 구성원·역할·소속 이력, 책임자·안전담당자, 폐쇄 처리, 연구실별 현황

## 5단계 — 승인 워크플로우 공통 모듈
`workflow_transitions` 테이블 + 업무 유형별 상태 전이 정의 + 이력 조회 컴포넌트. 6~8단계가 공통으로 사용.

## 6단계 — 안전교육
과정, 대상자, 이수기록, 이수증 업로드, 미이수 알림

## 7단계 — 안전점검 · 개선조치 · 위험성평가
체크리스트 템플릿 → 점검 실행 → 지적사항 → 개선조치 자동 생성 → 증빙 → 승인 → 종결

## 8단계 — 사고보고
사고·아차사고 보고, 민감정보 접근 제한, 처리 현황

## 9단계 — LMO 관리
시설·등급, 허가·신고(법정)와 내부관리 구분, 변경·폐쇄 이력, 관리대장, 문서·심의, 법정 일정 알림, 법령 개정 이력

## 10단계 — 알림 · 통합 검색 · 관리자 대시보드 통계

## 11단계 — 운영 준비
CSP, 오류 모니터링, 백업·복구 테스트, 개인정보처리방침 게시, 유출 대응 절차

## 이후 — 추가 모듈
화학물질, SDS, 폐기물, 장비, 안전시설, 야간 연구, 방문자, 보험·보상
