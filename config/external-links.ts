// 기관에서 실제로 쓰는 외부 시스템. 법령·교육·LMO 업무는 이 시스템들이 원본이고,
// taketheLMO 는 그 위에서 기관 내부 관리를 돕는다. 법령 문구를 옮겨 적을 때는 출처와 시행일을 함께 남긴다.
// TODO: edu / lmo 의 정식 명칭은 사이트에서 확인 후 수정 (자동 확인 불가했음)
export type ExternalLink = { label: string; href: string; description: string };

export const externalLinks = {
  labs: {
    label: "연구실안전정보망",
    href: "https://labs.go.kr/contents/siteMain.do",
    description: "연구실 안전 관련 법령, 고시, 매뉴얼 및 자료",
  },
  edu: {
    label: "연구실 안전교육",
    href: "https://edu.labs.go.kr/front/index.do",
    description: "연구활동종사자 법정 안전교육 수강 및 이수 확인",
  },
  lmo: {
    label: "LMO 정보시스템",
    href: "https://www.lmosafety.or.kr/mps",
    description: "LMO 연구시설 신고·허가 등 법정 업무",
  },
} satisfies Record<string, ExternalLink>;

// 경로별 관련 외부 사이트. 가장 길게 일치하는 접두어가 우선한다.
const byPrefix: [string, ExternalLink[]][] = [
  ["/safety/regulations", [externalLinks.labs]],
  ["/library", [externalLinks.labs]],
  ["/training", [externalLinks.edu]],
  ["/lmo", [externalLinks.lmo]],
  ["/lmo/training", [externalLinks.lmo, externalLinks.edu]],
];

export function externalLinksFor(pathname: string): ExternalLink[] {
  let best: [string, ExternalLink[]] | null = null;
  for (const entry of byPrefix) {
    const [prefix] = entry;
    const match = pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (match && (!best || prefix.length > best[0].length)) best = entry;
  }
  return best ? best[1] : [];
}
