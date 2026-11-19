import type { Sql } from "../local-auth/sql";
import { isDeepStrictEqual } from "node:util";
import { assessmentLabels } from "../demo/assessment-data";
import { inquiryBody, isInquiry, validateInquiry, type DemoState, type Ledger } from "../demo/model";
import { validateLedger } from "../demo/ledger";

export function validateRecordIds(state: DemoState) {
  for (const category of ["requests", "actions", "incidents", "inspections", "ledger", "courses", "members"] as const) {
    const ids = state[category].map(row => row.id);
    if (ids.some(id => typeof id !== "string" || !id.trim() || id.length > 160) || new Set(ids).size !== ids.length) throw new Error("업무 기록 식별자가 중복되었거나 올바르지 않습니다.");
  }
  const enrollmentIds = state.enrollments.map(row => `${row.courseId}:${row.at}`);
  if (new Set(enrollmentIds).size !== enrollmentIds.length) throw new Error("교육 이력 식별자가 중복되었습니다.");
  if (Object.keys(state.assessment).some(key => !Object.hasOwn(assessmentLabels, key))) throw new Error("LMO 확인 응답 항목을 확인해 주세요.");
  const dates = state.inspections.filter(row => row.daily).map(row => row.daily!.date);
  if (new Set(dates).size !== dates.length) throw new Error("같은 날짜의 일상점검은 정정 기능으로 수정해 주세요.");
}

export function canonicalOwnerRequests(state: DemoState, previous: DemoState | null) {
  return state.requests.map(row => {
    const old = previous?.requests.find(item => item.id === row.id);
    if (old && row.kind !== old.kind) throw new Error("제출한 신청·문의 유형은 변경할 수 없습니다.");
    if (!old || (old.status !== row.status && ["제출", "접수"].includes(row.status))) {
      if (!row.title.trim() || !row.body.trim()) throw new Error("신청 제목과 내용을 입력해 주세요.");
      if (isInquiry(row)) {
        validateInquiry(row.inquiry!);
        let assessment = old?.inquiry?.assessment;
        if (!old && row.inquiry?.assessment) {
          const keys = Object.keys(assessmentLabels);
          if (keys.some(key => !state.assessment[key]) || Object.keys(state.assessment).length !== keys.length) throw new Error("연결할 LMO 확인 응답 네 항목을 모두 작성해 주세요.");
          assessment = { ...state.assessment };
        }
        const inquiry = { ...row.inquiry!, assessment };
        return { ...row, inquiry, body: inquiryBody(inquiry) };
      }
    }
    return row;
  });
}

export function protectOwnerWorkflow(state: DemoState, previous: DemoState | null) {
  for (const category of ["requests", "actions", "incidents"] as const) {
    for (const row of state[category]) {
      const stored = previous?.[category].find(item => item.id === row.id);
      const old = stored && { ...stored, owner: state.role };
      if (!old) {
        if (row.history.length !== 1) throw new Error("새 기록의 처리 이력을 확인해 주세요.");
        if (category === "actions" && ("inspectionId" in row || "inspectionItem" in row)) throw new Error("점검 연결 개선조치는 서버에서 생성합니다.");
        continue;
      }
      if (isDeepStrictEqual(old, row)) continue;
      const expectedEvent = category === "requests" ? old.status === "보완 요청" && row.status === "제출" ? "보완 후 재제출" : old.status === "추가 정보 요청" && row.status === "접수" ? "추가 정보 제출" : null
        : category === "actions" && old.status === "조치 중" && row.status === "검토 대기" ? "검토 대기" : null;
      if (!expectedEvent) throw new Error("검토 중이거나 처리된 기록은 직접 변경할 수 없습니다.");
      if (row.history.length !== old.history.length + 1 || row.history.at(-1)?.event !== expectedEvent || !row.history.at(-1)?.note.trim()) throw new Error("처리 전이에 맞는 이력과 의견이 필요합니다.");
      if (category === "actions") {
        const allowed = new Set(["status", "note", "file", "history"]);
        if (Object.keys({ ...old, ...row }).some(key => !allowed.has(key) && !isDeepStrictEqual((old as unknown as Record<string, unknown>)[key], (row as unknown as Record<string, unknown>)[key]))) throw new Error("개선조치 제목·기한·연결 정보는 관리자가 정정합니다.");
      }
    }
  }
}

export async function validateChangedFiles(db: Sql, user: string, state: DemoState, previous: DemoState | null) {
  for (const category of ["actions", "incidents", "enrollments"] as const) {
    for (const row of state[category]) {
      const old = previous?.[category].find(item => category === "enrollments" ? "courseId" in item && "courseId" in row && item.courseId === row.courseId && item.at === row.at : "id" in item && "id" in row && item.id === row.id);
      const submitting = (!old || old.status !== row.status) && ["검토 대기", "등록 완료", "종결"].includes(row.status);
      const changedFile = !old || !isDeepStrictEqual(old.file, row.file);
      if (!submitting && !changedFile) continue;
      if (!row.file) {
        if (submitting && (category === "actions" || category === "enrollments")) throw new Error("등록한 첨부 원본이 필요합니다.");
        continue;
      }
      const file = await db.get("SELECT name,type,size FROM account_files WHERE user_id=? AND id=?", user, row.file.id);
      if (!file || file.name !== row.file.name || file.type !== row.file.type || Number(file.size) !== row.file.size) throw new Error("본인 계정에 업로드한 첨부 원본과 파일 정보가 일치해야 합니다.");
    }
  }
}

const ledgerBody = (row: Ledger) => { const copy = { ...row }; delete copy.revisions; return copy; };
export function canonicalLedger(row: Ledger, old: Ledger | undefined, actor: string): Ledger {
  if (old && isDeepStrictEqual(old, row)) return row;
  if (row.format === "lmo") validateLedger(row);
  else if (!row.label.trim() || !row.unit.trim() || !Number.isFinite(row.quantity) || row.quantity < 0) throw new Error("대상·수량·단위를 확인해 주세요.");
  const now = new Date().toISOString();
  if (!old) {
    if (row.revisions?.length) throw new Error("새 대장 기록에 기존 정정 이력을 넣을 수 없습니다.");
    return { ...row, actor, at: now };
  }
  const history = old.revisions || [], changes = row.revisions || [];
  if (!isDeepStrictEqual(changes.slice(0, history.length), history)) throw new Error("기존 대장 정정 이력은 변경할 수 없습니다.");
  if (row.actor !== old.actor || row.at !== old.at || row.format !== old.format) throw new Error("대장의 최초 기록자·시각·형식은 변경할 수 없습니다.");
  const before = ledgerBody(old), after = ledgerBody(row), revision = changes.at(-1);
  if (isDeepStrictEqual(before, after) || changes.length !== history.length + 1 || !revision?.reason.trim() || revision.reason.length > 2000 || !isDeepStrictEqual(revision.before, before) || !isDeepStrictEqual(revision.after, after)) throw new Error("대장 정정 사유와 실제 수정 전후 이력이 필요합니다.");
  return { ...after, revisions: [...history, { before, after, reason: revision.reason.trim(), at: now, actor }] };
}
