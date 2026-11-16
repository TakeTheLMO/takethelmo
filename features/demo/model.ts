import { assessmentText } from "./assessment-data";
export type Role =
  | "researcher"
  | "lab_manager"
  | "lmo_manager"
  | "safety_admin"
  | "super_admin";
export const profiles: Record<
  Role,
  { name: string; label: string; scope: string }
> = {
  researcher: { name: "김연구", label: "일반 연구원", scope: "나의 업무" },
  lab_manager: {
    name: "이담당",
    label: "연구실 안전담당자",
    scope: "바이오융합연구실",
  },
  lmo_manager: {
    name: "정바이오",
    label: "LMO 담당자",
    scope: "LMO 시설 업무",
  },
  safety_admin: {
    name: "박안전",
    label: "기관 안전관리자",
    scope: "데모연구원 전체",
  },
  super_admin: {
    name: "최관리",
    label: "시스템 관리자",
    scope: "데모연구원 전체",
  },
};
export type History = {
  at: string;
  actor: string;
  event: string;
  note: string;
};
export type FileRef = { id: string; name: string; size: number; type: string };
export const INQUIRY_KIND = "IBC 사전 문의";
export const approvalStatuses = [
  "제출",
  "검토 중",
  "보완 요청",
  "승인",
  "반려",
] as const;
export const inquiryStatuses = [
  "접수",
  "답변 준비 중",
  "추가 정보 요청",
  "답변 완료",
] as const;
export type RequestStatus =
  | (typeof approvalStatuses)[number]
  | (typeof inquiryStatuses)[number];
export type InquiryDetails = {
  assessment?: Record<string, string>;
  experimentType: string;
  materials: string;
  plannedStart: string;
  startUnknown: boolean;
  previousFiling: "있음" | "없음" | "모르겠어요";
  filingInfo: string;
  overview: string;
};
export type RequestItem = {
  id: string;
  title: string;
  kind: string;
  body: string;
  owner: Role;
  status: RequestStatus;
  history: History[];
  inquiry?: InquiryDetails;
};
export type Course = {
  id: string;
  title: string;
  category: string;
  duration: string;
  due: string;
  description: string;
};
export type Enrollment = {
  courseId: string;
  owner: Role;
  status: "수강 예정" | "등록 완료";
  file?: FileRef;
  completedAt?: string;
  at: string;
};
export type ActionItem = {
  id: string;
  title: string;
  note: string;
  status: "조치 중" | "검토 대기" | "종결";
  owner: Role;
  due: string;
  file?: FileRef;
  history: History[];
};
export type Inspection = {
  id: string;
  at: string;
  owner: Role;
  results: Record<string, string>;
  note: string;
};
export type Incident = {
  id: string;
  title: string;
  kind: string;
  place: string;
  body: string;
  occurredAt: string;
  owner: Role;
  status: "접수" | "확인 중" | "종결";
  file?: FileRef;
  history: History[];
};
export type Notification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  target: Role | "all";
  at: string;
};
export type LegacyLedger = {
  revisions?: LedgerRevision[];
  format?: "legacy";
  id: string;
  type: string;
  label: string;
  quantity: number;
  unit: string;
  at: string;
  actor: string;
};
export const ledgerUnits = ["vial", "tube", "plate", "마리", "ml"] as const;
export type LmoLedger = Omit<LegacyLedger, "format" | "quantity" | "unit"> & {
  format: "lmo";
  origin: "수입" | "분양" | "자체 제작" | "확인 필요";
  recordedDate: string;
  received: number | null;
  used: number | null;
  stored: number | null;
  unit: (typeof ledgerUnits)[number];
  notes: string;
};
export type Ledger = LegacyLedger | LmoLedger;
export type LedgerSnapshot =
  | Omit<LegacyLedger, "revisions">
  | Omit<LmoLedger, "revisions">;
export type LedgerRevision = {
  at: string;
  actor: string;
  reason: string;
  before: LedgerSnapshot;
  after: LedgerSnapshot;
};
export type RequestDraft = {
  title: string;
  body: string;
  inquiry: InquiryDetails;
  updatedAt: string;
};
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: string[];
};
export type DemoState = {
  requestDrafts?: Record<string, RequestDraft>;
  version: 2;
  role: Role;
  courses: Course[];
  enrollments: Enrollment[];
  requests: RequestItem[];
  actions: ActionItem[];
  inspections: Inspection[];
  incidents: Incident[];
  notifications: Notification[];
  read: Record<string, string[]>;
  bookmarks: string[];
  guideSteps: string[];
  ledger: Ledger[];
  members: { id: string; name: string; role: string; active: boolean }[];
  chat: ChatMessage[];
  assessment: Record<string, string>;
};
export function uid() {
  return crypto.randomUUID();
}
export function history(role: Role, event: string, note: string): History {
  return {
    at: new Date().toISOString(),
    actor: profiles[role].name,
    event,
    note,
  };
}
export function isAdmin(role: Role) {
  return role === "safety_admin" || role === "super_admin";
}
export function canReview(role: Role, item: RequestItem) {
  if (role === item.owner || role === "researcher") return false;
  if (isInquiry(item)) return role === "lmo_manager" || isAdmin(role);
  return (
    isAdmin(role) ||
    (role === "lmo_manager"
      ? item.kind === "LMO 시설 변경"
      : item.kind !== "LMO 시설 변경")
  );
}
export function isInquiry(item: Pick<RequestItem, "kind">) {
  return item.kind === INQUIRY_KIND;
}
export function requestComplete(item: RequestItem) {
  return isInquiry(item)
    ? item.status === "답변 완료"
    : ["승인", "반려"].includes(item.status);
}
export function requestNeedsReviewer(item: RequestItem) {
  return isInquiry(item)
    ? ["접수", "답변 준비 중"].includes(item.status)
    : ["제출", "검토 중"].includes(item.status);
}
export function requestNeedsOwner(item: RequestItem) {
  return isInquiry(item)
    ? item.status === "추가 정보 요청"
    : item.status === "보완 요청";
}
export function validateInquiry(value: InquiryDetails) {
  if (
    !value.experimentType.trim() ||
    !value.materials.trim() ||
    !value.overview.trim()
  )
    throw new Error(
      "실험 유형, 사용 물질, 실험 개요·문의 사항을 입력해 주세요.",
    );
  if (
    !value.startUnknown &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value.plannedStart) ||
      !Number.isFinite(Date.parse(value.plannedStart)))
  )
    throw new Error("예정 시작일을 입력하거나 미정을 선택해 주세요.");
  if (!["있음", "없음", "모르겠어요"].includes(value.previousFiling))
    throw new Error("기존 신고 여부를 선택해 주세요.");
}
export function inquiryBody(value: InquiryDetails) {
  return `실험 유형: ${value.experimentType.trim()}\n사용 물질: ${value.materials.trim()}\n예정 시작일: ${value.startUnknown ? "미정" : value.plannedStart}\n기존 LMO 신고: ${value.previousFiling}${value.previousFiling === "있음" && value.filingInfo.trim() ? ` (${value.filingInfo.trim()})` : ""}\n\n실험 개요·문의 사항\n${value.overview.trim()}${value.assessment ? `\n\n[연결된 LMO 확인 결과 · 법적 판정 아님]\n${assessmentText(value.assessment)}` : ""}`;
}
export function transitionRequest(
  item: RequestItem,
  role: Role,
  to: RequestStatus,
  note: string,
  body?: string,
  inquiry?: InquiryDetails,
): RequestItem {
  if (isInquiry(item)) {
    const resubmit =
      role === item.owner && item.status === "추가 정보 요청" && to === "접수";
    const review =
      canReview(role, item) &&
      ((item.status === "접수" && to === "답변 준비 중") ||
        (item.status === "답변 준비 중" &&
          ["추가 정보 요청", "답변 완료"].includes(to)));
    if (!resubmit && !review)
      throw new Error(
        "현재 역할 또는 문의 상태에서는 이 작업을 할 수 없습니다.",
      );
    if (!note.trim())
      throw new Error("답변 또는 추가 정보 내용을 입력해 주세요.");
    if (resubmit) {
      if (!inquiry) throw new Error("보완한 문의 정보를 입력해 주세요.");
      validateInquiry(inquiry);
    }
    const details = resubmit ? inquiry : item.inquiry;
    return {
      ...item,
      status: to,
      inquiry: details,
      body: details ? inquiryBody(details) : item.body,
      history: [
        ...item.history,
        history(role, resubmit ? "추가 정보 제출" : to, note.trim()),
      ],
    };
  }
  const resubmit =
    to === "제출" && item.status === "보완 요청" && role === item.owner;
  const review =
    canReview(role, item) &&
    ((item.status === "제출" && to === "검토 중") ||
      (item.status === "검토 중" &&
        ["승인", "반려", "보완 요청"].includes(to)));
  if (!resubmit && !review)
    throw new Error("현재 역할 또는 처리 상태에서는 이 작업을 할 수 없습니다.");
  if (!note.trim()) throw new Error("처리 의견을 입력해 주세요.");
  if (resubmit && !body?.trim())
    throw new Error("보완한 신청 내용을 입력해 주세요.");
  return {
    ...item,
    status: to,
    body: body?.trim() || item.body,
    history: [
      ...item.history,
      history(role, resubmit ? "보완 후 재제출" : to, note.trim()),
    ],
  };
}
export function transitionAction(
  item: ActionItem,
  role: Role,
  to: ActionItem["status"],
  note: string,
  file?: FileRef,
): ActionItem {
  const submit =
    item.status === "조치 중" && to === "검토 대기" && role === item.owner;
  const review =
    item.status === "검토 대기" &&
    (to === "종결" || to === "조치 중") &&
    role !== item.owner &&
    (isAdmin(role) || role === "lab_manager");
  if (!submit && !review)
    throw new Error("현재 역할 또는 처리 상태에서 변경할 수 없습니다.");
  if (!note.trim())
    throw new Error("조치 내용 또는 검토 의견을 입력해 주세요.");
  if (submit && !file && !item.file)
    throw new Error("조치 증빙 파일을 첨부해 주세요.");
  return {
    ...item,
    status: to,
    note: note.trim(),
    file: file || item.file,
    history: [...item.history, history(role, to, note.trim())],
  };
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
export function timeLabel(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function daysLeft(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (new Date(`${value.slice(0, 10)}T00:00:00`).getTime() - today.getTime()) /
      86400000,
  );
}
export function deadline(value: string) {
  const d = daysLeft(value);
  return d < 0 ? `${-d}일 지남` : d === 0 ? "오늘 마감" : `D-${d}`;
}
