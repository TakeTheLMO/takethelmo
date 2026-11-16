# 02. 현재 구현 현황

> 작업이 끝날 때마다 이 파일을 갱신한다. 표시: ✅ 완료 · 🟡 일부 · ⬜ 미구현
> 마지막 갱신: 인터뷰·팀 수정안의 로컬 데모 반영 (2026-11-17). 아래 운영 기능의 완성도와 데모 체험 범위는 별개다.

## 사용자 체험 데모 (`demo` 브랜치)

- 2026-11-17 추가: 관리대장 안내·예시/단위/세 수량/비고/CSV, IBC 사전 문의 5개 항목과 전용 답변 흐름, 모든 응답에서 문의할 수 있는 4문항 확인 지원, 자료실 준비서류 안내. [변경 내역과 검증](lmo-feedback-implementation.md).
- v2 저장 키와 v1 원본 보존, 손상 데이터 덮어쓰기 방지. 실제 기관 전송·운영 DB·공개 재배포는 포함하지 않음.
- 1차 반영 검증: 단위 51개, 브라우저 28개 전체 통과 (기존 22 + 신규 6). lint 오류 0/기존 경고 3, typecheck·production build 통과. 최신 Fable(`claude-fable-5-1`, effort max)와 실제 2회 검토 후 권고 반영. 아래 11월 4일 기록은 이전 검증 이력이다.

- 후속 보완: 신규 신청·문의 초안의 역할·유형별 자동 저장/복원/제출 후 삭제, 확인 응답 사본의 문의 연결, 대장 정정과 수정 전후·사유·정정자·시각 이력. 동일 브라우저에만 저장하며 실제 서버 전송은 하지 않음.
- 후속 검증: 단위 54개 통과. 전체 E2E 실행에서 29개 통과 후, 초안 제출 후 폼이 닫히는 동작에 맞춰 테스트 기대를 수정하고 신규 2개를 재실행해 통과(총 30개 시나리오 확인). 타입 검사·production build 통과, lint 오류 0/기존 경고 3. 모바일 375px 정정 이력 확인. 이번 후속 보완은 Codex가 구현·검증함.

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
