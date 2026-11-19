import type { DemoState } from "./model";
export const documents = [
  {
    id: "sop-start",
    title: "신규 연구원 첫 출입 체크리스트",
    category: "SOP",
    updated: "2026-11-02",
    version: "v2.1",
    target: "신규 연구원",
    tags: "출입 첫 방문 교육 보호구 SOP",
    body: "이 문서는 가상의 체험용 SOP입니다.\n1. 연구실 담당자에게 출입 가능 여부와 필수 교육을 확인합니다.\n2. 해당 실험에 적용되는 기관 승인 SOP의 최신판을 확인합니다.\n3. 담당자와 비상 연락망 및 대피 경로를 확인합니다.\n4. 승인된 절차를 이해한 뒤 업무를 시작합니다.",
    changes: ["v2.1 · 담당자 확인 항목 추가", "v2.0 · 최초 데모 공개"],
  },
  {
    id: "sop-lmo",
    title: "LMO 업무 시작 전 확인 안내",
    category: "LMO",
    updated: "2026-11-01",
    version: "v1.2",
    target: "LMO 취급 연구원",
    tags: "LMO 유전자 변형 생물체 신고 시설 변경",
    body: "가상 업무 안내이며 법적 판정 또는 실험 절차가 아닙니다.\n생물체와 도입 유전물질, 예정 업무, 시설의 기존 신고·허가 기록을 정리하여 기관 LMO 담당자에게 확인을 요청하세요.\n업무별 최신 기준과 공식 절차는 시험·연구용 LMO정보시스템에서 확인하세요.",
    changes: ["v1.2 · 담당자 확인 목록 보강", "v1.0 · 최초 데모 공개"],
  },
  {
    id: "form-change",
    title: "연구실·시설 변경 검토 요청서",
    category: "서식",
    updated: "2026-10-30",
    version: "v1.0",
    target: "연구실 담당자",
    tags: "신청 서식 변경 검토 승인 보완 LMO",
    body: "[체험용 서식 · 공식 제출 불가]\n신청 제목:\n변경 대상:\n변경 사유:\n변경 전/후:\n확인 요청 사항:\n첨부 자료 목록:",
    changes: ["v1.0 · 데모 서식 등록"],
  },
  {
    id: "guide-emergency",
    title: "사고 인지 시 연락·보고 안내",
    category: "사고 대응",
    updated: "2026-11-03",
    version: "v1.1",
    target: "모든 구성원",
    tags: "사고 비상 긴급 연락 대피 보고 아차사고",
    body: "데모 안내입니다. 실제 상황에서는 현장 안전 확보와 기관 비상계획에 따른 대응을 우선하고 필요한 긴급 도움을 요청하세요.\n이 홈페이지의 보고서 작성은 긴급 구조 요청을 대신하지 않습니다.\n안전이 확보된 뒤 발생 시각·장소·상황을 기록하고 기관 담당자에게 전달하세요. 구체적 대응은 기관 승인 SOP를 따르세요.",
    changes: ["v1.1 · 긴급 신고와 사후 보고 구분", "v1.0 · 최초 데모 공개"],
  },
  {
    id: "policy-education",
    title: "교육 이수 기록 등록 안내",
    category: "교육",
    updated: "2026-10-28",
    version: "v1.0",
    target: "모든 연구원",
    tags: "교육 이수증 수료증 등록 업로드 기한",
    body: "체험용 교육 관리 안내입니다. 실제 교육 대상·과정·이수 기준은 기관 담당자에게 확인하세요.\n공식 교육 사이트에서 본인의 교육을 이수하고 발급받은 이수증을 등록하는 흐름을 체험할 수 있습니다.\n데모의 파일 등록은 법정 교육 이수 인정 또는 진위 검증을 의미하지 않습니다.",
    changes: ["v1.0 · 데모 안내 등록"],
  },
  {
    id: "policy-safety",
    title: "연구실 일상점검 운영 예시",
    category: "안전 규정",
    updated: "2026-10-25",
    version: "v1.3",
    target: "연구실 안전담당자",
    tags: "점검 안전 규정 개선 지적사항 증빙 체크리스트",
    body: "기관 규정이 아닌 가상 운영 예시입니다.\n담당자가 정한 점검 항목을 확인하고 부적합 항목은 담당자·기한과 함께 기록합니다.\n조치 후 증빙을 등록하면 다른 검토자가 확인하고 종결하거나 재조치를 요청합니다.\n실제 점검 항목과 주기는 기관 승인 기준을 사용하세요.",
    changes: ["v1.3 · 개선조치 검토 단계 추가", "v1.2 · 예시 점검 항목 정리"],
  },
];
export const guideData = [
  {
    id: "first",
    title: "연구실에 처음 왔어요",
    subtitle: "첫 출입 전 필요한 확인을 차례대로",
    steps: [
      {
        title: "소속 연구실과 담당자 확인",
        text: "구성원 명단과 안전담당자를 확인하세요.",
        href: "/labs",
      },
      {
        title: "필수 교육 확인",
        text: "기관이 지정한 교육 과정과 기한을 확인하세요.",
        href: "/training/courses",
      },
      {
        title: "승인된 SOP 확인",
        text: "최신 문서의 적용 대상과 개정일을 확인하세요.",
        href: "/library/manuals",
      },
      {
        title: "출입 검토 요청",
        text: "담당자에게 확인받을 내용을 작성하세요.",
        href: "/mypage/requests",
      },
    ],
  },
  {
    id: "lmo",
    title: "LMO 업무를 시작해요",
    subtitle: "자료 확인부터 내부 검토까지",
    steps: [
      {
        title: "해당 여부 확인 지원",
        text: "확인이 필요한 항목을 정리하세요.",
        href: "/lmo/assessment",
      },
      {
        title: "시설 기록 확인",
        text: "시설 정보와 관리대장 예시를 확인하세요.",
        href: "/labs",
      },
      {
        title: "담당자 검토 요청",
        text: "공식 신고와 별도로 내부 확인을 요청하세요.",
        href: "/mypage/requests",
      },
    ],
  },
  {
    id: "education",
    title: "교육을 이수했어요",
    subtitle: "이수증 등록 후 내 현황 확인",
    steps: [
      {
        title: "이수증 등록",
        text: "PDF 또는 이미지 파일을 선택하세요.",
        href: "/training/courses",
      },
      {
        title: "내 기록 확인",
        text: "등록한 과정과 날짜를 확인하세요.",
        href: "/demo",
      },
    ],
  },
];
export const checklist = [
  {
    id: "route",
    title: "출입·대피 통로",
    detail: "통로에 적치물이 없는지 확인",
  },
  {
    id: "contact",
    title: "비상 연락망",
    detail: "기관 승인 연락망 게시 여부 확인",
  },
  {
    id: "document",
    title: "SOP 접근성",
    detail: "업무별 최신 승인 문서를 찾을 수 있는지 확인",
  },
  {
    id: "label",
    title: "보관 구역 표시",
    detail: "기관 기준에 따른 표시 여부 확인",
  },
  {
    id: "record",
    title: "교육·점검 기록",
    detail: "해당 업무의 기록 확인 여부",
  },
];
export function createSeed(): DemoState {
  const now = new Date();
  const iso = now.toISOString();
  const date = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return {
    version: 1,
    role: "researcher",
    courses: [
      {
        id: "basic",
        title: "하반기 연구실 안전교육",
        category: "공통",
        duration: "예시 과정 · 2시간",
        due: date(3),
        description:
          "안전한 연구활동을 위한 기본 사항을 확인하는 예시 과정입니다.",
      },
      {
        id: "bio",
        title: "LMO 생물안전교육",
        category: "LMO",
        duration: "예시 과정 · 2시간",
        due: date(7),
        description:
          "LMO 업무 관련 교육 대상과 이수 기준은 담당자에게 확인하세요.",
      },
      {
        id: "new",
        title: "신규 연구원 오리엔테이션",
        category: "신규",
        duration: "예시 과정 · 1시간",
        due: date(14),
        description:
          "시설 안내와 비상 연락망을 확인하는 가상 오리엔테이션입니다.",
      },
    ],
    enrollments: [
      { courseId: "basic", owner: "researcher", status: "수강 예정", at: iso },
    ],
    requests: [
      {
        id: "REQ-1001",
        title: "공동장비실 출입 검토 요청",
        kind: "연구실 출입",
        body: "공동장비실 이용을 위한 교육 확인 및 출입 검토를 요청합니다.",
        owner: "researcher",
        status: "제출",
        history: [
          {
            at: iso,
            actor: "김연구",
            event: "제출",
            note: "신규 출입 검토를 요청합니다.",
          },
        ],
      },
      {
        id: "REQ-1002",
        title: "LMO 시설 담당자 변경 확인",
        kind: "LMO 시설 변경",
        body: "가상 시설의 담당자 변경에 필요한 내부 확인 사항을 검토해 주세요.",
        owner: "lab_manager",
        status: "제출",
        history: [
          {
            at: iso,
            actor: "이담당",
            event: "제출",
            note: "내부 검토용 예시입니다. 공식 신고 기록이 아닙니다.",
          },
        ],
      },
    ],
    actions: [
      {
        id: "ACT-1001",
        title: "출입 통로 적치물 정리",
        note: "가상 점검에서 발견한 개선 사항입니다.",
        status: "조치 중",
        owner: "researcher",
        due: date(2),
        history: [
          {
            at: iso,
            actor: "이담당",
            event: "조치 중",
            note: "정리 후 증빙과 함께 검토를 요청하세요.",
          },
        ],
      },
    ],
    inspections: [],
    incidents: [],
    notifications: [
      {
        id: "welcome",
        title: "체험을 시작해 보세요",
        detail:
          "교육 이수증 등록 → 안전 현황, 신청 → 역할 전환 → 검토를 경험할 수 있어요.",
        href: "/support/guides",
        target: "all",
        at: iso,
      },
    ],
    read: {},
    bookmarks: ["sop-start"],
    guideSteps: [],
    ledger: [
      {
        id: "LED-1001",
        type: "확인",
        label: "예제 관리기록 A",
        quantity: 1,
        unit: "건",
        at: iso,
        actor: "정바이오",
      },
    ],
    members: [
      { id: "m1", name: "김연구", role: "일반 연구원", active: true },
      { id: "m2", name: "이담당", role: "연구실 안전담당자", active: true },
      { id: "m3", name: "정바이오", role: "LMO 담당자", active: true },
    ],
    chat: [
      {
        id: "intro",
        role: "assistant",
        text: "안녕하세요! 교육, SOP, LMO 확인, 점검과 사고 보고에 대해 물어보세요. 가상 자료에서 관련 안내를 찾아드릴게요. 실제 AI 모델에 연결되지 않은 체험용 도우미입니다.",
      },
    ],
    assessment: {},
  };
}
export function searchDocuments(query: string, category = "전체") {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return documents.filter(
    (d) =>
      (category === "전체" || d.category === category) &&
      tokens.every((t) =>
        `${d.title} ${d.tags} ${d.body}`.toLowerCase().includes(t),
      ),
  );
}
export function answerQuestion(question: string) {
  const topics = [
    {
      words: /교육|이수|수료/,
      id: "policy-education",
      text: "내 교육에서 과정과 기한을 확인하고, 공식 교육 사이트에서 발급받은 이수증을 등록할 수 있어요. 등록하면 나의 안전 현황에 바로 반영됩니다. 데모에서는 파일 등록만 체험하며 실제 이수 여부를 검증하지 않아요.",
    },
    {
      words: /lmo|유전자|생물체|신고/i,
      id: "sop-lmo",
      text: "LMO 해당 여부 확인 지원에서 생물체와 예정 업무에 관한 확인 항목을 정리해 보세요. 그 결과와 시설 기록을 기관 LMO 담당자에게 확인받아야 해요. 이 도우미는 해당 여부나 법적 신고 완료를 판정하지 않습니다.",
    },
    {
      words: /사고|긴급|비상|누출|노출|부상/,
      id: "guide-emergency",
      text: "실제 긴급 상황에서는 현장 안전과 긴급 도움 요청을 우선해 주세요. 기관 비상계획과 승인된 SOP를 따르세요. 긴급 안내 화면에서 공식 안내 경로를 확인하고, 안전이 확보된 뒤 사고·아차사고를 기록할 수 있어요. 이 채팅은 긴급 신고 창구가 아닙니다.",
    },
    {
      words: /점검|개선|조치/,
      id: "policy-safety",
      text: "안전점검에서 항목을 확인하고 부적합을 선택하면 개선조치가 생성돼요. 담당 연구원이 증빙을 등록한 뒤 다른 검토자가 종결하거나 재조치를 요청하는 흐름입니다.",
    },
    {
      words: /신청|승인|보완|검토|반려/,
      id: "form-change",
      text: "신청·검토에서 신청서를 제출해 보세요. 상단 역할을 담당자로 바꾸면 검토 시작 → 보완 요청·승인·반려를 처리할 수 있어요. 보완 요청을 받으면 작성자 역할에서 내용을 수정해 재제출할 수 있습니다.",
    },
    {
      words: /sop|처음|출입|보호구|문서/i,
      id: "sop-start",
      text: "상황별 가이드의 ‘연구실에 처음 왔어요’를 따라 담당자, 교육, 승인 SOP, 출입 검토 순서로 확인해 보세요. 자료실에서는 최신 예제 문서와 개정 이력을 확인할 수 있어요.",
    },
  ];
  const matched = topics.filter((t) => t.words.test(question));
  return matched.length
    ? {
        text: matched.map((t) => t.text).join("\n\n"),
        sources: matched.map((t) => t.id),
      }
    : {
        text: "가상 자료에서 이 질문의 근거를 찾지 못했어요. 교육, LMO, SOP, 점검, 사고, 신청에 대해 질문하거나 통합 검색을 사용해 주세요. 기관 고유 절차는 담당자에게 확인해 주세요.",
        sources: [],
      };
}
