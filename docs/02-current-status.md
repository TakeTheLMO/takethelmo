# 02. 현재 구현 현황

> 작업이 끝날 때마다 이 파일을 갱신한다. 표시: ✅ 완료 · 🟡 일부 · ⬜ 미구현
> 마지막 갱신: v0.3.0 (2026-11-01)

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
| 메인 홈페이지 | ✅ | 데이터 섹션은 빈 상태 표시 |
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
✅ profiles, organizations, departments, buildings, rooms, labs, lab_memberships, lab_member_roles, membership_history, lmo_facilities, role_assignments, permissions, audit_logs
⬜ notices, posts, documents, attachments, training_*, inspection_*, corrective_actions, incident_reports, lmo_permits, lmo_records, workflow_transitions, notifications

## 업무 기능 (전부 ⬜ — 메뉴와 준비 중 화면만 존재)
공지사항 · Q&A · FAQ · 자료실 · 연구실 관리 · 안전교육 · 안전점검 · 개선조치 · 사고보고 · LMO · 알림 · 통합 검색 · 승인 워크플로우

## 테스트·CI
| 항목 | 상태 |
|---|---|
| 단위 테스트 (권한 규칙, 리다이렉트, 메뉴 설정) | ✅ |
| E2E (보호 경로, 준비 중, 그룹 리다이렉트, 404, 약관) | ✅ |
| RLS 테스트 (pgTAP) | 🟡 기본 케이스 |
| GitHub Actions | ✅ `.github/workflows/ci.yml` |
| package-lock.json | ⬜ 첫 `npm install` 후 커밋 필요 |
| supabase/config.toml | ⬜ `supabase init` 후 커밋 |

## 알려진 확인 필요 사항
- v0.3.0 변경분은 npm 설치가 불가한 환경에서 작성되어 **`npm run build` 를 아직 돌리지 않았다.** 첫 설치 후 `npm run lint && npm run typecheck && npm test && npm run build` 로 확인할 것.
