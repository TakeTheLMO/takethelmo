# CHANGELOG

## Unreleased — 1단계 (첫 실행·배포 확인)
- 의존성 보안: `vitest` 2 → 5 (+`vite` 7), `next` 내부 `postcss` 를 `overrides` 로 8.5.32 이상 고정. `npm run audit` (high 이상) 통과
- `supabase init` → `supabase/config.toml` 추가 (로컬 Auth: 공개 가입 끔, 이메일 확인 켬, `/auth/callback` 리다이렉트 허용)
- `.gitignore` 에 Playwright 산출물(`test-results`, `playwright-report`) 추가
- 검증: lint·typecheck·test(25)·audit·build·e2e(7) 로컬 통과

## 0.3.1 — 2026-11-02 (package.json 버전은 다음 커밋에서 올림)
- 외부 연계 시스템 링크: 연구실안전정보망, 연구실 안전교육, LMO 정보시스템 (`config/external-links.ts`)
  - 자료실·안전관리 규정·안전교육·LMO 메뉴 페이지에 "관련 외부 사이트" 표시, 푸터 하단에 링크
- 빌드 오류 수정: `"use server"` 파일의 상수 export 제거 (reset-password)
- 타입 오류 수정: Supabase 쿠키 `setAll` 타입 명시 (supabase-js 2.118 대응)

## 0.3.0 — 2026-11-01  (뼈대 정리 + AI 협업 문서)
### 추가
- 로고 마크(방패+플라스크) + `takethe**LMO**` 워드마크, 파비콘(`app/icon.svg`), `public/logo.svg`
- `PageHeader`(경로 표시), `SectionLayout`(섹션 메뉴), `ComingSoon` 공통 컴포넌트
- `/privacy`, `/terms` 페이지(본문은 운영기관 확정 후), 사이트 404 페이지, "본문 바로가기" 링크
- 메뉴 항목 설명(`description`), 역할 한국어 표시명(`ROLE_LABELS`)
- `config/navigation.test.ts` (메뉴 중복·경로 규칙 검사), E2E 4개 추가
- `AGENTS.md`/`CLAUDE.md`, `docs/` (통합 명세, 현황, 로드맵, 규칙·템플릿, 결정 기록, 페이지 명세 양식, 공지사항 명세 예시)
- `.gitattributes`(LF 고정), `.vscode/extensions.json`

### 수정
- `/library`, `/community` 상위 메뉴와 홈 퀵메뉴 "자료실"이 404 → 첫 하위 메뉴로 이동
- 푸터의 개인정보처리방침·이용약관 링크 404 수정
- 모바일 메뉴가 페이지 이동 후에도 열려 있던 문제, Esc 로 닫기
- 로그인 상태에서도 홈 Hero 에 "로그인" 버튼이 보이던 문제
- 관리자 헤더에 역할이 영문 키(`safety_admin`)로 보이던 문제
- 헤더: 활성 메뉴 밑줄, 드롭다운 디자인, 모바일에서 사용자/로그아웃 영역
- 홈: 퀵메뉴 카드 설명, 섹션별 "전체보기" 링크
- Footer: 메뉴 바로가기 추가, 하단 바에 약관 링크
- 빌드 산출물 `tsconfig.tsbuildinfo` 제거

### 주의
- 이번 변경은 npm 설치가 불가한 환경에서 작성되어 `npm run build` 미검증. 첫 설치 후 lint·typecheck·test·build 를 실행할 것.

## 0.2.0
RBAC + 범위, 기관/부서/건물/호실, 감사로그 트리거, 인증 콜백·비밀번호 재설정, 관리자 레이아웃, 테스트·CI

## 0.1.0
초기 프로젝트, 홈·Header·Footer, 로그인 UI
