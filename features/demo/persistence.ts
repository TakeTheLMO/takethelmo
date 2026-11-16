import {
  profiles,
  isInquiry,
  approvalStatuses,
  inquiryStatuses,
  type DemoState,
  type FileRef,
  type History,
  type RequestItem,
  type Ledger,
} from "./model";
function validAssessment(value: unknown) {
  return (
    value === undefined ||
    (!!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value).every((a) =>
        ["예", "아니요", "모르겠어요"].includes(a),
      ))
  );
}
export const STORAGE_KEY = "takethelmo:frontend-demo:v2";
export const LEGACY_STORAGE_KEY = "takethelmo:frontend-demo:v1";

function validRequest(r: RequestItem) {
  if (!isInquiry(r))
    return (
      !r.inquiry && (approvalStatuses as readonly string[]).includes(r.status)
    );
  if (!(inquiryStatuses as readonly string[]).includes(r.status) || !r.inquiry)
    return false;
  try {
    const d = r.inquiry;
    if (
      ![
        d.experimentType,
        d.materials,
        d.plannedStart,
        d.previousFiling,
        d.filingInfo,
        d.overview,
      ].every((v) => typeof v === "string") ||
      typeof d.startUnknown !== "boolean"
    )
      return false;
    // 문구·입력 정책 변경으로 기존 기록을 잠그지 않도록 저장 구조만 확인한다.
    return (
      ["있음", "없음", "모르겠어요"].includes(d.previousFiling) &&
      validAssessment(d.assessment)
    );
  } catch {
    return false;
  }
}
function validLedger(r: Ledger) {
  if (!r || typeof r.label !== "string") return false;
  if (
    r.revisions !== undefined &&
    (!Array.isArray(r.revisions) ||
      !r.revisions.every(
        (entry) =>
          entry &&
          typeof entry.at === "string" &&
          typeof entry.actor === "string" &&
          typeof entry.reason === "string" &&
          entry.before &&
          entry.after &&
          !("revisions" in entry.before) &&
          !("revisions" in entry.after) &&
          validLedger(entry.before as Ledger) &&
          validLedger(entry.after as Ledger),
      ))
  )
    return false;
  if (r.format !== "lmo")
    return (
      (r.format === undefined || r.format === "legacy") &&
      typeof r.quantity === "number" &&
      Number.isFinite(r.quantity)
    );
  if (
    ![r.id, r.type, r.at, r.actor, r.unit, r.notes, r.recordedDate].every(
      (v) => typeof v === "string",
    ) ||
    !["수입", "분양", "자체 제작", "확인 필요"].includes(r.origin)
  )
    return false;
  return [r.received, r.used, r.stored].every(
    (amount) =>
      amount === null ||
      (typeof amount === "number" && Number.isFinite(amount)),
  );
}
export function decodeState(raw: string): DemoState {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("invalid");
  const version = (value as { version?: unknown }).version;
  if (version !== 1 && version !== 2) throw new Error("invalid");
  const migrated = { ...value, version: 2 };
  if (!validState(migrated)) throw new Error("invalid");
  return migrated;
}

export function validState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const s = value as DemoState;
  const validFile = (file?: FileRef) =>
    !file ||
    (typeof file.id === "string" &&
      typeof file.name === "string" &&
      typeof file.size === "number" &&
      typeof file.type === "string");
  const validHistory = (items: History[]) =>
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (h) =>
        h &&
        ["at", "actor", "event", "note"].every(
          (k) => typeof h[k as keyof History] === "string",
        ),
    );
  const validDate = (date: string) =>
    typeof date === "string" && Number.isFinite(new Date(date).getTime());
  return (
    s.version === 2 &&
    (s.requestDrafts === undefined ||
      (!!s.requestDrafts &&
        typeof s.requestDrafts === "object" &&
        !Array.isArray(s.requestDrafts) &&
        Object.values(s.requestDrafts).every(
          (d) =>
            d &&
            typeof d.title === "string" &&
            typeof d.body === "string" &&
            typeof d.updatedAt === "string" &&
            d.inquiry &&
            [
              d.inquiry.experimentType,
              d.inquiry.materials,
              d.inquiry.plannedStart,
              d.inquiry.filingInfo,
              d.inquiry.overview,
            ].every((v) => typeof v === "string") &&
            typeof d.inquiry.startUnknown === "boolean" &&
            ["있음", "없음", "모르겠어요"].includes(d.inquiry.previousFiling) &&
            validAssessment(d.inquiry.assessment),
        ))) &&
    !!profiles[s.role] &&
    [
      "courses",
      "enrollments",
      "requests",
      "actions",
      "inspections",
      "incidents",
      "notifications",
      "bookmarks",
      "guideSteps",
      "ledger",
      "members",
      "chat",
    ].every((k) => Array.isArray(s[k as keyof DemoState])) &&
    !!s.read &&
    typeof s.read === "object" &&
    !!s.assessment &&
    typeof s.assessment === "object" &&
    Object.values(s.read).every(
      (ids) => Array.isArray(ids) && ids.every((id) => typeof id === "string"),
    ) &&
    Object.values(s.assessment).every((v) =>
      ["예", "아니요", "모르겠어요"].includes(v),
    ) &&
    s.bookmarks.every((id) => typeof id === "string") &&
    s.guideSteps.every((id) => typeof id === "string") &&
    s.courses.length > 0 &&
    s.courses.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        validDate(c.due),
    ) &&
    s.requests.every(
      (r) =>
        r &&
        !!profiles[r.owner] &&
        typeof r.title === "string" &&
        typeof r.body === "string" &&
        typeof r.kind === "string" &&
        validRequest(r) &&
        validHistory(r.history),
    ) &&
    s.actions.every(
      (a) =>
        a &&
        !!profiles[a.owner] &&
        typeof a.title === "string" &&
        typeof a.note === "string" &&
        validDate(a.due) &&
        ["조치 중", "검토 대기", "종결"].includes(a.status) &&
        validHistory(a.history) &&
        validFile(a.file),
    ) &&
    s.incidents.every(
      (i) =>
        i &&
        !!profiles[i.owner] &&
        typeof i.title === "string" &&
        typeof i.body === "string" &&
        typeof i.place === "string" &&
        typeof i.occurredAt === "string" &&
        ["접수", "확인 중", "종결"].includes(i.status) &&
        validHistory(i.history) &&
        validFile(i.file),
    ) &&
    s.enrollments.every(
      (e) =>
        e &&
        !!profiles[e.owner] &&
        typeof e.courseId === "string" &&
        validFile(e.file) &&
        (e.status !== "등록 완료" || !!e.file),
    ) &&
    s.inspections.every(
      (i) =>
        i && !!profiles[i.owner] && i.results && typeof i.results === "object",
    ) &&
    s.notifications.every(
      (n) =>
        n &&
        typeof n.title === "string" &&
        typeof n.detail === "string" &&
        typeof n.href === "string" &&
        n.href.startsWith("/demo"),
    ) &&
    s.members.every(
      (m) =>
        m &&
        typeof m.name === "string" &&
        typeof m.role === "string" &&
        typeof m.active === "boolean",
    ) &&
    s.ledger.every(validLedger) &&
    s.chat.every(
      (m) =>
        m &&
        typeof m.text === "string" &&
        ["user", "assistant"].includes(m.role) &&
        (!m.sources ||
          (Array.isArray(m.sources) &&
            m.sources.every((id) => typeof id === "string"))),
    )
  );
}
