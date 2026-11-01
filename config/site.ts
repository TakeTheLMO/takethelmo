export const siteConfig = {
  name: "taketheLMO",
  subtitle: "Laboratory Safety Management Platform",
  koreanName: "연구실 안전관리 통합 플랫폼",
  description:
    "연구실의 안전을 관리하고 연구자의 안전한 연구활동을 지원하는 통합 안전관리 플랫폼.",
};

// TODO: 실제 운영기관 정보로 교체
export const footerConfig = {
  organization: "운영기관명 (입력 필요)",
  department: "담당부서 (입력 필요)",
  contact: "문의처 (입력 필요)",
  legal: [
    { label: "개인정보처리방침", href: "/privacy" },
    { label: "이용약관", href: "/terms" },
  ],
  // 관련 기관 링크. 실제 주소를 확인한 뒤에만 추가한다. 예: { label: "기관명", href: "https://..." }
  external: [] as { label: string; href: string }[],
};
