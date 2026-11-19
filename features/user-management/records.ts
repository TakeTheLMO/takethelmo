import { createSeed } from "../demo/data";
import type { DemoState, FileRef, Inspection } from "../demo/model";
import { validateDaily } from "../inspections/daily";
import { inquiryBody, validateInquiry, type InquiryDetails, type Ledger } from "../demo/model";
import { reviseLedger } from "../demo/continuity";
import { assessmentLabels } from "../demo/assessment-data";
import { checklist } from "../demo/data";
export const categories = {
  requests: "신청·사전 문의", enrollments: "교육·이수증", incidents: "사고·아차사고",
  inspections: "점검", actions: "개선조치", ledger: "관리대장", members: "구성원",
  courses: "교육과정", lab: "연구실 정보", assessment: "LMO 확인 응답",
} as const;
export type Category = keyof typeof categories;
export type ContentRecord = { category: Category; key: string; title: string; data: Record<string, unknown>; example: boolean };
const keyOf = (category: Category, data: Record<string, unknown>) => category === "enrollments"
  ? `${data.courseId}:${data.owner}:${data.at}` : String(data.id);
function stable(value: unknown): string {
  return JSON.stringify(value, (key, value) => ["at", "due"].includes(key) ? undefined : value);
}
export function contentRecords(state: DemoState): ContentRecord[] {
  const seed = createSeed();
  const rows = (Object.keys(categories) as Category[]).filter(category => !["lab", "assessment"].includes(category)).flatMap(category => {
    const initial = seed[category] as unknown as Record<string, unknown>[];
    return (state[category] as unknown as Record<string, unknown>[]).filter(data => {
      const match = initial.find(original => category === "enrollments"
        ? original.courseId === data.courseId && original.owner === data.owner
        : original.id === data.id);
      return !match || stable(match) !== stable(data);
    }).map(data => ({ category, key: keyOf(category, data), data,
      title: String(data.title || data.label || data.name || (category === "inspections" && (data as Inspection).daily ? `${(data as Inspection).daily!.date} · ${(data as Inspection).daily!.labName} 일상점검` : "") || state.courses.find(c => c.id === data.courseId)?.title || data.note || categories[category]),
      example: initial.some(original => category !== "enrollments" && original.id === data.id),
    }));
  });
  if (state.lab) rows.push({ category: "lab", key: "lab", title: state.lab.name, data: { ...state.lab }, example: false });
  if (Object.keys(state.assessment).length) rows.push({ category: "assessment", key: "assessment", title: "LMO 확인 응답", data: { answers: state.assessment }, example: false });
  return rows;
}
export function recordHref(user: string, row: Pick<ContentRecord, "category" | "key">) {
  return `/management/users?user=${encodeURIComponent(user)}&category=${row.category}&record=${encodeURIComponent(row.key)}#selected-records`;
}
export function recordFile(row: ContentRecord): FileRef | undefined { return row.data.file as FileRef | undefined; }
export function filesInState(state: DemoState): FileRef[] {
  const files = [...state.enrollments, ...state.actions, ...state.incidents].flatMap(row => row.file ? [row.file] : []);
  return [...new Map(files.map(file => [file.id, file])).values()];
}
export const editFields: Record<string, string> = {
  title: "제목", body: "내용", note: "기록 내용", place: "발생 장소", occurredAt: "발생 시각",
  label: "대상 이름", quantity: "수량", received: "입고량", used: "사용량", stored: "보관량", unit: "단위", type: "유형", name: "이름",
  description: "설명", location: "위치", code: "연구실 코드", category: "교육 분류", duration: "교육 시간", due: "기한",
  completedAt: "이수일", notes: "비고", origin: "확보 경로", recordedDate: "기록일", role: "구성원 역할", active: "활동 상태", results: "점검 결과", answers: "확인 응답",
  storageLocation: "보관 위치", containerCapacity: "용기당 용량",
};
const editable: Record<Category, string[]> = {
  requests: ["title", "body"], enrollments: ["completedAt"], incidents: ["title", "body", "place", "occurredAt"],
  inspections: ["note", "results"], actions: ["title", "note", "due"], ledger: ["type", "label", "quantity", "received", "used", "stored", "unit", "origin", "recordedDate", "notes", "storageLocation", "containerCapacity"],
  members: ["name", "role", "active"], courses: ["title", "category", "duration", "due", "description"], lab: ["name", "location", "code", "description"], assessment: ["answers"],
};
export function fieldsFor(row: ContentRecord) { return editable[row.category].filter(key => key in row.data || (row.category === "enrollments" && key === "completedAt") || (row.category === "ledger" && row.data.format === "lmo" && ["storageLocation", "containerCapacity"].includes(key))); }
export const choiceFields: Record<string, string[]> = { origin: ["수입", "분양", "자체 제작", "확인 필요"], unit: ["vial", "tube", "plate", "마리", "ml"], role: ["연구원", "연구실 책임자", "안전담당자", "LMO 담당자"] };
export const nestedFields = { results: Object.fromEntries(checklist.map(row => [row.id, row.title])), answers: assessmentLabels };
export function reviewSteps(category: string, status: unknown): string[] {
  const transitions: Record<string, Record<string, string[]>> = {
    requests: { "제출": ["검토 중"], "검토 중": ["보완 요청", "승인", "반려"], "접수": ["답변 준비 중"], "답변 준비 중": ["추가 정보 요청", "답변 완료"] },
    actions: { "검토 대기": ["종결", "조치 중"] }, incidents: { "접수": ["확인 중"], "확인 중": ["종결"] },
  };
  return transitions[category]?.[String(status)] || [];
}
export function editRecord(state: DemoState, category: Category, key: string, fields: Record<string, unknown>, actor: string, reason: string): DemoState {
  const record = contentRecords(state).find(row => row.category === category && row.key === key);
  if (!record) throw new Error("자료를 찾을 수 없습니다.");
  if (category === "inspections" && record.data.daily) {
    const inspection = structuredClone(record.data) as Inspection;
    const daily = inspection.daily!;
    if (fields.confirm) {
      if (Object.keys(fields).length !== 1 || daily.confirmation) throw new Error("정정 내용을 먼저 저장한 뒤 별도로 확인해 주세요.");
      daily.confirmation = { actor, actorId: "", at: "", note: reason, recordRevision: daily.history.length };
    } else for (const [field, value] of Object.entries(fields)) {
      if (field === "results") inspection.results = value as Inspection["results"];
      else if (field === "note") inspection.note = value as string;
      else if (field === "dailyNotes") daily.itemNotes = value as Record<string, string>;
      else if (field === "labName" || field === "naReason") daily[field] = value as string;
      else if (field === "inspectionDue") daily.due = value as string;
      else throw new Error("수정할 수 없는 항목입니다.");
    }
    validateDaily(inspection, true);
    if (JSON.stringify(inspection) === JSON.stringify(record.data)) throw new Error("변경된 내용이 없습니다.");
    return { ...state, inspections: state.inspections.map(row => row.id === key ? inspection : row) };
  }
  const data = { ...record.data };
  for (const [field, value] of Object.entries(fields)) {
    if (field === "status") {
      if (!reviewSteps(category, record.data.status).includes(String(value))) throw new Error("현재 상태에서 처리할 수 없습니다.");
      data.status = value; continue;
    }
    if (field === "inquiry" && record.data.inquiry) {
      const inquiry = { ...(value as InquiryDetails), assessment: (record.data.inquiry as InquiryDetails).assessment };
      validateInquiry(inquiry); data.inquiry = inquiry; data.body = inquiryBody(inquiry); continue;
    }
    if (!fieldsFor(record).includes(field)) throw new Error("수정할 수 없는 항목입니다.");
    if (field === "active") {
      if (typeof value !== "boolean") throw new Error("활동 상태를 확인해 주세요.");
    } else if (field === "results" || field === "answers") {
      const allowedValues = field === "results" ? ["적합", "부적합", "해당 없음"] : ["예", "아니요", "모르겠어요"];
      if (!value || typeof value !== "object" || Array.isArray(value) || !Object.entries(value).every(([key, answer]) => key in nestedFields[field] && allowedValues.includes(String(answer)))) throw new Error("응답 항목을 확인해 주세요.");
    } else
    if (["quantity", "received", "used", "stored"].includes(field)) {
      if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) throw new Error("수량을 확인해 주세요.");
    } else {
      if (typeof value !== "string" || value.length > 20000 || (["title", "name", "label", "unit", "body", "place"].includes(field) && !value.trim())) throw new Error("수정 내용을 입력해 주세요.");
      if (["due", "completedAt", "recordedDate", "occurredAt"].includes(field) && value && !Number.isFinite(Date.parse(value))) throw new Error("날짜를 확인해 주세요.");
      if (field === "origin" && !choiceFields.origin.includes(value)) throw new Error("확보 경로를 확인해 주세요.");
      if (field === "unit" && data.format === "lmo" && !choiceFields.unit.includes(value)) throw new Error("단위를 확인해 주세요.");
    }
    data[field] = value;
  }
  if (JSON.stringify(data) === JSON.stringify(record.data)) throw new Error("변경된 내용이 없습니다.");
  if (Array.isArray(data.history)) data.history = [...data.history, { at: new Date().toISOString(), actor, event: fields.status ? String(fields.status) : "관리자 정정", note: reason }];
  if (category === "ledger") {
    const revised = reviseLedger(record.data as Ledger, record.data as Ledger, data as Ledger, "super_admin", reason);
    revised.revisions![revised.revisions!.length - 1].actor = actor;
    Object.assign(data, revised);
  }
  if (category === "lab") return { ...state, lab: data as DemoState["lab"] };
  if (category === "assessment") return { ...state, assessment: data.answers as DemoState["assessment"] };
  return { ...state, [category]: (state[category] as unknown as Record<string, unknown>[]).map(row => keyOf(category, row) === key ? data : row) };
}
