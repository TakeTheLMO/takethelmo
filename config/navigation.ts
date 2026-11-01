export type NavItem = { label: string; href: string; description?: string };
export type NavGroup = { label: string; href: string; items: NavItem[] };

// 메뉴 추가/수정은 이 파일만 고치면 Header, 모바일 메뉴, 섹션 메뉴, 준비 중 페이지에 모두 반영된다.
// 규칙 (config/navigation.test.ts 가 검사):
//  - 모든 href 는 중복되지 않는다.
//  - 하위 메뉴 href 는 그룹 href 로 시작한다.
//  - 그룹 href 가 하위 메뉴에 없으면 첫 번째 하위 메뉴로 이동한다 (예: /library → /library/manuals).
export const navigation: NavGroup[] = [
  {
    label: "안전관리",
    href: "/safety",
    items: [
      { label: "안전관리 안내", href: "/safety", description: "연구실 안전관리 체계와 업무 흐름을 안내합니다." },
      { label: "안전점검", href: "/safety/inspections", description: "정기·수시 안전점검 일정과 진행 현황을 관리합니다." },
      { label: "점검 체크리스트", href: "/safety/checklists", description: "점검 유형별 체크리스트 양식을 관리합니다." },
      { label: "점검 결과", href: "/safety/results", description: "점검 결과와 지적사항을 조회합니다." },
      { label: "개선조치 관리", href: "/safety/corrective-actions", description: "지적사항의 개선조치 담당자, 기한, 완료 증빙을 관리합니다." },
      { label: "사고보고", href: "/safety/incidents", description: "사고 및 아차사고를 보고하고 처리 현황을 확인합니다." },
      { label: "비상대응 안내", href: "/safety/emergency", description: "비상 연락망과 상황별 대응 절차를 안내합니다." },
      { label: "안전관리 규정", href: "/safety/regulations", description: "기관 안전관리 규정과 개정 이력을 제공합니다." },
    ],
  },
  {
    label: "연구실 관리",
    href: "/labs",
    items: [
      { label: "연구실 목록", href: "/labs", description: "기관 내 연구실 목록을 조회합니다." },
      { label: "연구실 상세정보", href: "/labs/details", description: "연구실 위치, 분야, 유해인자 등 상세정보를 확인합니다." },
      { label: "연구실 구성원", href: "/labs/members", description: "연구실 구성원과 역할을 관리합니다." },
      { label: "연구실 책임자", href: "/labs/managers", description: "연구실 책임자와 안전관리 담당자를 확인합니다." },
      { label: "장비 및 시설 현황", href: "/labs/facilities", description: "연구실 장비와 안전시설 현황을 관리합니다." },
      { label: "연구실별 안전관리 현황", href: "/labs/safety-status", description: "연구실별 점검·교육·개선조치 현황을 확인합니다." },
    ],
  },
  {
    label: "안전교육",
    href: "/training",
    items: [
      { label: "교육 안내", href: "/training", description: "법정 안전교육 종류와 이수 기준을 안내합니다." },
      { label: "교육과정 목록", href: "/training/courses", description: "개설된 교육과정을 조회합니다." },
      { label: "교육 대상자", href: "/training/targets", description: "교육 대상자와 미이수자를 확인합니다." },
      { label: "교육 이수현황", href: "/training/records", description: "개인·연구실별 교육 이수 현황을 확인합니다." },
      { label: "이수증 및 증빙자료", href: "/training/certificates", description: "교육 이수증과 증빙자료를 관리합니다." },
    ],
  },
  {
    label: "LMO 관리",
    href: "/lmo",
    items: [
      { label: "LMO 안내", href: "/lmo", description: "LMO 연구시설 관리 기준과 절차를 안내합니다." },
      { label: "LMO 연구시설 목록", href: "/lmo/facilities", description: "LMO 연구시설 목록을 조회합니다." },
      { label: "시설별 등급 및 신고·허가 정보", href: "/lmo/grades", description: "시설 안전관리 등급과 신고·허가 상태를 확인합니다." },
      { label: "시설 담당자", href: "/lmo/managers", description: "LMO 시설별 담당자를 확인합니다." },
      { label: "시설 변경 및 폐쇄 이력", href: "/lmo/history", description: "시설 변경·폐쇄 이력을 조회합니다." },
      { label: "LMO 관리대장", href: "/lmo/ledger", description: "LMO 보유·사용·폐기 관리대장을 관리합니다." },
      { label: "생물안전 관련 문서", href: "/lmo/documents", description: "생물안전 관련 문서와 심의 기록을 관리합니다." },
      { label: "LMO 안전교육 이력", href: "/lmo/training", description: "LMO 관련 안전교육 이수 이력을 확인합니다." },
    ],
  },
  {
    label: "자료실",
    href: "/library",
    items: [
      { label: "안전관리 매뉴얼", href: "/library/manuals" },
      { label: "안전교육 자료", href: "/library/training" },
      { label: "사고대응 매뉴얼", href: "/library/incident-response" },
      { label: "법령 및 규정", href: "/library/laws" },
      { label: "MSDS 자료", href: "/library/msds" },
      { label: "문서 서식", href: "/library/forms" },
      { label: "안전 관련 동영상", href: "/library/videos" },
    ],
  },
  {
    label: "커뮤니티",
    href: "/community",
    items: [
      { label: "공지사항", href: "/community/notices" },
      { label: "Q&A", href: "/community/qna" },
      { label: "FAQ", href: "/community/faq" },
    ],
  },
];

export type NavContext = { group: NavGroup; item: NavItem | null };

// 경로가 속한 메뉴 그룹과 (정확히 일치하는) 메뉴 항목을 찾는다.
export function findNavContext(pathname: string): NavContext | null {
  for (const group of navigation) {
    const item = group.items.find((i) => i.href === pathname) ?? null;
    if (item) return { group, item };
  }
  for (const group of navigation) {
    if (group.href === pathname) return { group, item: null };
  }
  return null;
}

export function findNavLabel(pathname: string): string | null {
  return findNavContext(pathname)?.item?.label ?? null;
}

export const isPathActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
