# 02. 현재 구현 현황

> 작업이 끝날 때마다 이 파일을 갱신한다. 표시: ✅ 완료 · 🟡 일부 · ⬜ 미구현

> 2026-11-19 배포 수정: Vercel 에서 `/portal`·`/community/notices` 가 500, 로그인 API 가 503 이던 원인은 포털 SQLite 파일 생성 실패(서버리스 읽기 전용 파일시스템). 포털 저장소를 비동기 `Sql` 인터페이스로 바꾸고 `PORTAL_DATABASE_URL` 이 있으면 Supabase Postgres 를 쓰도록 했다(로컬·테스트는 SQLite 유지). Supabase 프로젝트에 0001~0004 마이그레이션 적용. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 이름도 인식. 배포 DB 에는 `admin/admin` 을 만들지 않고 `PORTAL_ADMIN_PASSWORD` 로만 생성. 검증: 단위 84개 통과, 타입 검사·lint(오류 0/기존 경고 3)·production build 통과, Postgres 쪽 SQL 은 Supabase 에서 롤백 트랜잭션으로 확인. 기존 로컬 SQLite 데이터는 배포 DB 로 이관하지 않았다.

> 2026-11-19: 인증 체계 2개(포털 SQLite / 기관 Supabase) 병행을 결정(D-15)하고 경계를 `AGENTS.md` 2-1 절에 문서화. 역할 표시명 통일(D-14). 통합 여부는 D-16(결정 필요).

## 최신 포털 상태 — 2026-11-17 PPT 반영·계정 검토

- 기준: 현재 `/portal`과 SQLite 계정·업무 저장. 아래 날짜별 메모와 예전 Supabase 표는 당시 구현 이력이며 최신 포털의 미구현 목록으로 읽지 않는다.
- 일상점검: 월간 달력, 일반·전기·소방 11항목, 항목별 양호/불량/미해당·조치사항, 일일 미해당 사유, 월간 CSV. 실제 계정의 점검자·등록 시각과 정정 이력을 서버가 기록한다. 불량 항목은 개선조치에 연결한다.
- 관리자: 사용자별 점검 확인·정정, 확인자·시각·대상 이력 보존, 내용 변경 시 재확인. 사용자에게 처리 알림을 제공하고 관리자 업무 현황은 사용자들의 미종결 자료를 합산한다.
- 대장: 보관위치·용기당 용량을 수량과 분리하고 검색·단위 필터·정정 이력·검색 결과 CSV에 반영했다.
- 권한·무결성: 공개 가입의 시스템 관리자 선택을 제거했다. 모든 일반 역할의 관리 화면/API·타인 자료/첨부 접근을 차단한다. 자기 승인·이력/기록자 변조·타인 증빙 참조를 서버에서 거부한다. 예전 계정·자료는 유지한다.
- 동시 저장: 독립적인 초안 변경은 최신 서버 상태와 결합한다. 같은 자료 충돌은 최신 서버 자료와 모든 로컬 복구 사본을 보존한다. 복구 저장 공간이 부족하면 현재 입력을 유지하고 재시도·다운로드를 제공한다. 관리자 정정도 수정 당시 원본과 버전을 검사한다.
- 실제 Claude Code `claude-opus-5-5`, `--effort xhigh`로 변경 전 2회·1차 구현 후 2회 검토했다. 최종 교정 패치는 Codex가 검증했으며 Claude가 재검토한 범위와 구분한다.
- 최종 검증: **단위 84개·브라우저 30개 전체 통과**, production build·타입 검사 통과, lint 오류 0/기존 경고 3. Chrome 데스크톱·390px 모바일, 실제 3001 관리자 계정 및 콘솔 오류 0 확인. 테스트 데이터는 별도 임시 DB에서만 생성했다.
- 남은 범위: 실제 AI/RAG, 기관 인증·정식 IBC/LMO 신고·전자서명, 연구실 공통 구성원 권한, 외부 알림. 일상점검과 관리자 확인은 포털 계정 범위이며 기관 승인이나 법정 완료를 뜻하지 않는다.
- 상세: [채팅 요구사항 점검](2026-11-17-requirements-review.md), [일상점검 명세](pages/daily-inspections.md), [사용자 관리](pages/user-management.md).

## 이전 구현 이력

> 2026-11-17: SQLite 로컬 계정 인증 연결. 회원가입·로그인·로그아웃, 데모 페이지 세션 검증, 계정별 브라우저 기록·첨부 저장 추가. 운영 업무 서버 동기화는 미구현. 검증: lint 오류 0(기존 경고 3), typecheck/build 통과, 단위 47개 통과, E2E 24개 시나리오 통과(계정 시나리오는 테스트 선택자 수정 후 개별 재실행).

> 2026-11-17 추가: `admin / admin` 프로토타입 계정, 가입 시 역할 필수 선택 및 DB 저장, 최초 체험 역할·상단 표시 연결. 기존 계정·세션 보존. 검증: 단위 50개 통과, 브라우저 전체 25개 중 23개 통과 후 선택란 라벨·검증 오류 응답을 수정하고 계정 3개 재실행 통과(총 25개 시나리오 확인). 타입 검사·build 통과, lint 오류 0/기존 경고 3. 모바일 가입 화면과 관리자 화면 확인. [계정 명세](pages/local-auth.md).

> 2026-11-17 정리: 중복된 직책 선택을 제거하고 역할 하나로 통합. 계정 상단에도 역할만 표시. 기존 계정과 세션 유지.

> 2026-11-17 추가: 체험 역할 전환을 `admin` 아이디 계정에만 표시. 일반 계정은 가입 역할을 유지하고 저장 데이터 복원·탭 동기화·수정 시에도 적용. 시스템 관리자 역할로 신규 가입해도 전환 권한은 없음. 검증: 단위 51개, 브라우저 전체 26개 통과. typecheck·production build 통과. 일반 계정의 전환 메뉴 숨김·저장된 타 역할 무시, admin의 전환·새로고침 복원 확인.

> 2026-11-17 추가: admin 전용 `/demo/users`, 사용자 검색·계정 수정·관리자 참조 메모, 전체/사용자별 등록 자료·첨부·이력, 관리자 활동 알림. 계정별 SQLite 기록/파일 동기화와 충돌 검사, 기존 브라우저 자료 이전을 추가. 검증: 단위 54개·전체 브라우저 29개 통과. typecheck·production build 통과, lint 오류 0/기존 경고 3. 별도 브라우저의 사용자 등록·첨부→관리자 조회/수정/다운로드→사용자 반영, 비관리자 API 차단, 저장 실패·충돌 복구, 390px 화면 확인. 이전의 브라우저 전용 저장 설명은 과거 상태다. [명세](pages/user-management.md).

> 2026-11-17 예시 추가: `[예시]` 사용자 6명(활성 5/비활성 1), 등록 자료 18건, PNG 첨부 7개 및 등록 알림. `npm run seed:examples`는 기존 데이터 보존·중복 추가 방지·사전 SQLite 백업을 적용한다. 실제 자료와 구분하는 라벨과 가상 첨부를 사용.

> 2026-11-17 포털 통합: `/portal` 프레임에 업무 페이지 연결, `/login`·`/signup` 통합, `/demo/*` 이전 주소 이동. 신규 계정 빈 자료 시작·기존 실제 자료/첨부/예시 계정 보존. 문의 초안/확인 응답 연결·대장 세 수량/정정 이력 이관. admin의 타인 신청 검토/승인·문의 답변, 서버 자기 승인 거부·이력 보호를 추가. 검증: 단위 58개, 포털 브라우저 23개 전체 통과. 최종 주소/헤더 수정 후 접근·리다이렉트 7개 재검증 통과. 타입 검사·production build(71개 경로) 통과, lint 오류 0/기존 경고 3. [이관 명세](pages/portal-integration.md).

> 2026-11-17 관리자 확장: 사용자별/전체 등록 자료 카테고리·상태·첨부 필터, 전체 첨부 및 연결 자료 참조, 연구실·교육과정·확인 응답 정정 추가. `/management/menus`에서 전체 일반 메뉴와 포털·약관 페이지의 안내 및 공통 자료를 게시·수정·보관하고 관련 사용자 업무 자료를 관리한다. 게시 내용은 실제 메뉴·통합 검색에 반영되며 미게시/보관 첨부는 일반 계정에 차단된다. 변경 사유·이력·버전 충돌 검사 적용. 단위 63개 통과, 최종 콘텐츠 테스트 4개 재검증. 브라우저 전체 25개 중 24개 통과 후 저장 안내/목록 갱신 순서를 수정하고 관련 5개 재실행 모두 통과(25개 시나리오 확인). 최종 build·타입 검사 통과, lint 오류 0/기존 경고 3. 실제 3001 관리자 화면과 모바일 확인, 브라우저 콘솔 오류 0. [명세](pages/user-management.md).

> 이전 갱신: 사용자 요청 프론트엔드 데모 추가 (2026-11-04). 아래 운영 기능의 완성도와 데모 체험 범위는 별개다.

## 사용자 체험 데모 (`demo` 브랜치)

- 기준: 원격 `origin/demo`, `d11b74b47cd930093c0819387b575c35353829d5`에서 별도 클론.
- 사용자 요청: 검토 단계 기능을 포함한 15개 사용자 기능을 가상 데이터와 프론트엔드만으로 체험. 기존 다중 모듈/가상 데이터 금지 규칙의 이번 요청에 한정한 예외.
- 진입: `/` → `/demo`, 기존 홈 `/portal`. 기존 로그인·공지사항·관리자 인증/RLS 변경 없음.
- 위치: `features/demo`, `components/ui/DemoUI.tsx`, `app/demo`. [명세](pages/demo.md).
- 구현: 개인 현황, 역할 전환, 교육 계획·이수증 원본 저장, 알림, 통합 검색, 예제 자료 기반 도우미, 상황별 진행 가이드, LMO 확인 목록, SOP·서식/개정 이력/즐겨찾기/다운로드, 긴급 안내, 점검과 개선조치 검토, 사고 후속 처리, 신청 보완/재제출/승인/반려, 시설·구성원·관리대장, 모바일 메뉴.
- 저장: localStorage의 버전 키 + IndexedDB 첨부(5MB 이하 PDF/PNG/JPG). 오류 피드백, 손상 데이터 복구 안내, 명시적 초기화. 실제 서버·업무 데이터와 분리.
- 운영 미구현: 실제 AI/RAG, 서버 저장/권한, 법정 신고·교육 연동, 법적 판정, 외부 알림. 예제 승인/등록을 실제 법정 완료로 표시하지 않음.
- 검증 완료(2026-11-04): 단위 44개 통과, E2E 22개 통과(기존 인증 10 + 데모 흐름/파일/모바일 12), lint/typecheck/production build 통과. lint에는 기존 파일의 경고 3개가 있으며 오류는 없음. Chrome 1440px/390px 화면을 직접 확인했고, 모바일 전체 13개 경로의 가로 넘침과 런타임 오류 검사도 통과.
- 실행 환경: Node 24.12.0, 설치된 Chrome, E2E는 별도 포트 3100 사용. Windows 최종 E2E 실행 시 D 드라이브의 새 임시 폴더와 `NODE_OPTIONS=--max-old-space-size=1024` 사용. 테스트 과정은 실제 서비스 계정이나 DB를 사용하지 않음.

## 기반
| 항목 | 상태 | 위치 / 비고 |
|---|---|---|
| Next.js 15 + TS + Tailwind 프로젝트 | ✅ | `package.json` (Node 22) |
| 브랜드 로고 (마크 + 워드마크, 파비콘) | ✅ | `components/layout/Logo.tsx`, `public/logo.svg`, `app/icon.svg` |
| 공통 Header (드롭다운, 활성 표시, 모바일 메뉴) | ✅ | `components/layout/Header.tsx` |
| 공통 Footer (운영기관, 메뉴, 약관 링크) | ✅ | 운영기관 정보는 `config/site.ts` 에 입력 필요 |
| PageHeader / SectionLayout (경로표시 + 섹션 메뉴) | ✅ | `components/layout/` |
| 준비 중 페이지 (메뉴 전체) | ✅ | `app/(site)/[...slug]/page.tsx`, 그룹 경로는 첫 하위 메뉴로 이동 |
| 외부 연계 사이트 링크 (메뉴별 + 푸터) | ✅ | `config/external-links.ts` |
| 404 / 403 페이지 | ✅ | `app/(site)/not-found.tsx`, `forbidden/` |
| 개인정보처리방침 / 이용약관 페이지 | 🟡 | 경로만 있음. 본문은 운영기관 확정 후 |
| 메인 홈페이지 | ✅ | "최신 공지사항" 은 로그인 사용자에게 실제 5건, 나머지 섹션은 빈 상태 |
| 공통 UI: Pagination, LoginRequired | ✅ | `components/ui/` |
| 로컬 데모 데이터 | ✅ | `supabase/seed.sql` (로컬 `db reset` 전용, 운영 금지). README "로컬 데모 데이터" |
| 관리자 레이아웃 (사이드바, 역할별 메뉴) | ✅ | `app/(admin)/admin/layout.tsx` |
| 보안 헤더 | 🟡 | CSP 미적용 (`next.config.ts` TODO) |

## 인증·권한
| 항목 | 상태 | 비고 |
|---|---|---|
| 로그인 / 로그아웃 | ✅ | Server Action, 실패·네트워크 오류 처리 |
| 비밀번호 재설정 / 초대 수락 | ✅ | `/forgot-password`, `/reset-password` |
| 인증 콜백 (PKCE, token_hash) | ✅ | `/auth/callback` |
| 초대 발송 로직 | 🟡 | `lib/admin/invite.ts` 만 있음, 화면 없음 |
| RBAC + 범위 (DB) | ✅ | `0002` 함수·트리거·RLS |
| 서버 가드 `requireUser/requireRole` | ✅ | `lib/auth/guards.ts` |
| 관리자 MFA | ⬜ | guards.ts TODO |
| 사용자·권한 관리 화면 | ⬜ | `/admin/users`, `/admin/roles` |

## 감사로그
| 항목 | 상태 | 비고 |
|---|---|---|
| 행 변경 자동 기록 (트리거) | ✅ | `attach_standard_triggers` |
| 인증 이벤트 기록 | ✅ | `lib/audit.ts` |
| 불변성 (UPDATE/DELETE 차단) | ✅ | |
| 감사로그 조회 화면 | ✅ | `/admin/audit-logs` (필터·페이지네이션 없음) |

## 데이터 테이블
✅ profiles, organizations, departments, buildings, rooms, labs, lab_memberships, lab_member_roles, membership_history, lmo_facilities, role_assignments, permissions, audit_logs, notices (`0003`)
⬜ posts, documents, attachments, training_*, inspection_*, corrective_actions, incident_reports, lmo_permits, lmo_records, workflow_transitions, notifications

## 업무 기능
| 기능 | 상태 | 위치 / 비고 |
|---|---|---|
| 공지사항 | 🟡 | `features/notices/`, `/community/notices`, `/community/notices/[id]`, `/admin/notices` (목록·작성·수정·게시중단/다시 게시). 코드·단위·E2E 완료, **RLS 테스트(`02_notices.test.sql`)와 로그인 상태 화면은 로컬 Supabase 에서 미확인** |

⬜ 나머지 (메뉴와 준비 중 화면만 존재): Q&A · FAQ · 자료실 · 연구실 관리 · 안전교육 · 안전점검 · 개선조치 · 사고보고 · LMO · 알림 · 통합 검색 · 승인 워크플로우

## 테스트·CI
| 항목 | 상태 |
|---|---|
| 단위 테스트 (권한 규칙, 리다이렉트, 메뉴 설정) | ✅ |
| E2E (보호 경로, 준비 중, 그룹 리다이렉트, 404, 약관) | ✅ |
| RLS 테스트 (pgTAP) | 🟡 기본 케이스 |
| GitHub Actions | ✅ `.github/workflows/ci.yml` |
| package-lock.json | ✅ 커밋됨 |
| supabase/config.toml | ✅ 커밋됨 (로컬: 초대 전용, 이메일 확인, `/auth/callback` 허용) |
| 로컬 검증 (lint·typecheck·test·build·e2e) | ✅ 2026-11-03 공지사항 추가 후 통과 (단위 37, E2E 10) |
| `supabase test db` (RLS) | ⬜ 로컬 미실행 (Docker 필요) |

## 1단계 진행 현황
| 항목 | 상태 |
|---|---|
| 1. npm install / lock 커밋 | ✅ |
| 2. lint·typecheck·test·build | ✅ (lint 경고 3개, 오류 0) |
| 3. Supabase 프로젝트 생성·마이그레이션·super_admin | ⬜ |
| 4. `supabase init` / `supabase test db` | 🟡 init 완료, test db 미실행 |
| 5. GitHub push → Vercel 연결 | ⬜ |
| 6. `config/site.ts` 운영기관 정보 | ⬜ |

## 알려진 확인 필요 사항
- `npm audit` moderate 14건 남음 (eslint·typescript-eslint 계열 개발 도구). CI 기준(high 이상)은 통과.
- `next` 내부 postcss 는 `package.json` 의 `overrides` 로 8.5.32 이상에 고정 (Next 16 업그레이드 전 임시 조치).
- 로컬 Node 24 에서도 검증됨. 배포 기준은 `.nvmrc` 의 22.
