# 01. 통합 제품 명세 — taketheLMO

> 원본: `original-specs/01-기본-명세서.md`, `original-specs/02-보안-아키텍처-추가요구사항.md`
> 이 문서는 두 원본을 하나로 합치고, 이후 내린 결정(`05-decisions.md`)을 반영한 **기준 문서**다.

## 1. 개요
| 항목 | 내용 |
|---|---|
| 서비스명 | taketheLMO (연구실 안전관리 통합 플랫폼 / Laboratory Safety Management Platform) |
| 목적 | 연구실 안전관리·연구실 정보·안전교육·LMO 관리·사고보고·자료를 하나의 웹에서 처리 |
| 형태 | 실제 DB·로그인을 갖춘 Full-stack 웹 앱 (정적 홈페이지 아님) |
| 최우선 가치 | 확장성, 유지보수성, 권한 보안, 기록 보존 |

## 2. 기술 스택
Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Lucide React · Supabase (PostgreSQL / Auth / Storage) · Vercel · GitHub Actions
- UI 컴포넌트: 자체 경량 컴포넌트(`components/ui`) 사용. shadcn/ui 는 필요 시 도입 (`05-decisions.md` D-01)
- 테스트: Vitest(단위) · Playwright(E2E) · pgTAP(`supabase test db`, RLS)

## 3. 브랜드·디자인
- 로고: 방패+플라스크 마크 + `takethe**LMO**` 표기 (LMO 강조). 파일: `public/logo.svg`, `app/icon.svg`, `components/layout/Logo.tsx`
- 메인 컬러: 짙은 녹색 `brand-700 #175537` / 보조: 흰색, gray
- 방향: 연구기관형 SaaS, 카드 UI, 충분한 여백, 과한 애니메이션 금지, 접근성·가독성 우선, PC·태블릿·모바일 반응형

## 4. 레이아웃
### 일반 사이트 `app/(site)`
```
┌ Header (sticky) ────────────────────────────────────────┐
│ [로고]        안전관리 연구실관리 안전교육 LMO 자료실 커뮤니티   [로그인] │
└──────────────────────────────────────────────────────────┘
  PageHeader (경로 표시 / 제목 / 설명 / 액션)
  ┌ 섹션 메뉴 ┐ ┌ 본문 ─────────────────────┐
  │ 같은 그룹 │ │                            │
  │ 하위 메뉴 │ │                            │
  └──────────┘ └────────────────────────────┘
  Footer (서비스 소개 · 운영기관 · 메뉴 · 개인정보처리방침 · 이용약관)
```
- Header: 왼쪽 로고, 가운데 드롭다운 내비(hover·키보드 focus), 오른쪽 로그인/사용자. 현재 메뉴 밑줄 표시. `lg` 미만은 햄버거 메뉴(페이지 이동·Esc 로 닫힘).
- 하위 페이지는 `SectionLayout` 사용 (PageHeader + 왼쪽 섹션 메뉴).

### 관리자 `app/(admin)/admin`
상단 관리자 헤더 + 왼쪽 사이드바(역할별 메뉴) + 메인. 일반 사이트 Header/Footer 를 쓰지 않는다.

## 5. 메인 홈페이지 (`/`)
1. Hero — "안전한 연구환경, taketheLMO" / 서브 문구 / 버튼: 안전관리 바로가기, 연구실 정보 확인, 로그인(비로그인일 때만)
2. Quick Menu — 안전관리, 연구실 관리, 안전교육, LMO 관리, 사고보고, 자료실
3. 안전관리 현황 · 최신 공지사항 · 연구실 안전정보 · 최근 등록 자료 (데이터 연동 전에는 빈 상태)

## 6. 메뉴 (기준: `config/navigation.ts`, `config/admin-navigation.ts`)
| 그룹 | 하위 메뉴 (경로) |
|---|---|
| 안전관리 `/safety` | 안내 `/safety` · 안전점검 `/inspections` · 점검 체크리스트 `/checklists` · 점검 결과 `/results` · 개선조치 `/corrective-actions` · 사고보고 `/incidents` · 비상대응 `/emergency` · 규정 `/regulations` |
| 연구실 관리 `/labs` | 목록 `/labs` · 상세정보 `/details` · 구성원 `/members` · 책임자 `/managers` · 장비·시설 `/facilities` · 연구실별 현황 `/safety-status` |
| 안전교육 `/training` | 안내 `/training` · 교육과정 `/courses` · 대상자 `/targets` · 이수현황 `/records` · 이수증 `/certificates` |
| LMO 관리 `/lmo` | 안내 `/lmo` · 연구시설 `/facilities` · 등급·신고·허가 `/grades` · 담당자 `/managers` · 변경·폐쇄 이력 `/history` · 관리대장 `/ledger` · 생물안전 문서 `/documents` · LMO 교육 이력 `/training` |
| 자료실 `/library` | 매뉴얼 `/manuals` · 교육자료 `/training` · 사고대응 매뉴얼 `/incident-response` · 법령·규정 `/laws` · MSDS `/msds` · 서식 `/forms` · 동영상 `/videos` |
| 커뮤니티 `/community` | 공지사항 `/notices` · Q&A `/qna` · FAQ `/faq` |
| 관리자 `/admin` | 대시보드 · 사용자 · 권한 · 연구실 · 안전교육 · 점검 · 사고보고 · LMO · 공지사항 · 자료실 · 감사로그 · 시스템 설정 |

미구현 페이지는 공통 레이아웃 + "준비 중" 안내. 작동하지 않는 버튼·허위 데이터 금지.

## 7. 인증
- Supabase Auth, 이메일+비밀번호. **초대 전용**(공개 회원가입 없음, D-02)
- 로그인 · 로그아웃 · 초대/초대 수락 · 이메일 인증 · 비밀번호 재설정 · 인증 콜백(`/auth/callback`, PKCE + token_hash)
- 프로필 · 계정 비활성화 · 관리자 MFA(TOTP, 미구현)
- 실패·네트워크 오류 메시지 표시, 로딩 상태는 예외에서도 반드시 해제

## 8. 권한 (RBAC + 범위)
| 역할 | 표시명 | 범위 |
|---|---|---|
| super_admin | 최고관리자 | 전역. super_admin 지정·해제는 이 역할만 |
| safety_admin | 안전관리자 | 기관. 일반 사용자·lab_manager·lmo_manager 관리 |
| lab_manager | 연구실 관리자 | 담당 연구실 |
| lmo_manager | LMO 관리자 | 담당 LMO 시설 |
| researcher | 연구활동종사자 | 본인·소속 연구실 조회 |

- 본인 권한 변경 불가, 마지막 super_admin 보호, 비활성 계정은 모든 검사에서 탈락
- 검사 위치: middleware → `requireRole()` → RLS/트리거

## 9. 데이터
- 구현됨(0001·0002): profiles, organizations, departments, buildings, rooms, labs, lab_memberships, lab_member_roles, membership_history, lmo_facilities, role_assignments, permissions, audit_logs
- 예정: notices, posts, documents, attachments, training_courses, training_records, hazards, risk_assessments, inspection_templates, inspection_items, inspection_runs, inspection_responses, corrective_actions, incident_reports, lmo_permits, lmo_records, workflow_transitions, notifications, legal_references
- 공통: UUID PK, created_at/updated_at/created_by/updated_by, status, FK·인덱스·check 제약, RLS + GRANT, 하드 삭제 금지, 감사로그 자동 기록
- 파일: 비공개 Storage 버킷 + Signed URL, DB 에는 경로·메타데이터만

## 10. 업무 상태 (승인 워크플로우)
`draft → submitted → reviewing → approved | rejected → in_progress → completed → closed`
업무 유형별로 허용 전이를 다르게 정의. 전이마다 담당자·시각·사유 기록, 과거 이력 조회 가능.

## 11. 기능 모듈 (각각 독립 모듈 `features/<모듈>`)
- 연구실 관리: 기관/부서/건물/호실, 책임자·안전담당자, 구성원·역할·소속 이력, 폐쇄·상태
- 안전관리: 유해인자, 위험성평가, 점검 일정·체크리스트·결과, 개선조치(담당자·기한·증빙·승인·종결, 점검 지적사항에서 자동 생성), 사고·아차사고, 비상대응
- 안전교육: 과정, 대상자, 이수기록, 이수증
- LMO: 시설·등급, 법정 허가·신고 vs 내부 관리 구분, 변경·폐쇄 이력, 관리대장, 문서, 심의기록, 교육, 법정 일정 알림, 관련 법령 시행일·개정 이력 보존
- 추후: 화학물질, SDS, 폐기물, 장비, 안전시설, 야간 연구, 방문자, 보험·보상
- 공통: 알림(수신 권한 적용), 통합 검색(허용된 자료만)

## 12. 보안·개인정보
개인정보 최소 수집, 보유기간 관리(`profiles.retention_until`), 민감정보 분리·접근 제한, 파일 형식·크기 검증, 다운로드 권한 확인, 감사로그 불변, 백업·복구 절차, 유출 대응체계, CSP 헤더(예정).

## 13. 외부 연계 시스템 (`config/external-links.ts`)
기관에서 실제 사용하는 시스템. 법정 업무의 **원본은 외부 시스템**이고 taketheLMO 는 기관 내부 관리·이력·현황을 담당한다.
| 시스템 | 주소 | 용도 | 연결된 메뉴 |
|---|---|---|---|
| 연구실안전정보망 | https://labs.go.kr/contents/siteMain.do | 법령·고시·매뉴얼·자료 | 자료실, 안전관리 규정 |
| 연구실 안전교육 | https://edu.labs.go.kr/front/index.do | 법정 안전교육 수강·이수 | 안전교육, LMO 안전교육 이력 |
| LMO 정보시스템 | https://www.lmosafety.or.kr/mps | LMO 연구시설 신고·허가 | LMO 관리 |

- 자료실 "법령 및 규정"은 법령 원문을 복제하지 않고 연구실안전정보망 원문 링크 + 기관 내부 해설·적용 시행일을 관리한다.
- 안전교육 이수는 외부 시스템에서 이루어지므로, taketheLMO 에는 이수 기록(과정명, 이수일, 이수증 파일)을 등록·확인하는 방식으로 설계한다. 자동 연동(API)은 제공 여부 확인 전까지 범위 밖.
- LMO 신고·허가 상태는 외부 시스템 처리 결과(접수번호, 처리일, 증빙)를 입력받아 표시한다. 외부 처리 기록 없이 "완료"로 표시하지 않는다.
- edu·lmo 사이트의 정식 명칭은 확인 후 `external-links.ts` 를 수정한다.

## 14. 품질·배포
ESLint · TypeScript · 단위/통합/E2E/RLS 테스트 · GitHub Actions CI · Vercel Preview/Production 환경변수 분리 · 오류 모니터링 · 의존성 보안 업데이트.
