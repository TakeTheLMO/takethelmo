import type { ActionItem, Inspection } from "../demo/model";

// Screenshot-derived reference items. An institution must approve its own checklist.
export const dailyChecklist = [
  { id: "general-risk", group: "일반 안전", title: "사전유해인자위험분석 보고서 게시 상태" },
  { id: "general-clean", group: "일반 안전", title: "연구실 정리·정돈 및 청결 상태" },
  { id: "general-food", group: "일반 안전", title: "연구실 내 흡연·음식물 섭취 여부 확인" },
  { id: "general-equipment", group: "일반 안전", title: "안전수칙·표지, 보호구·구급용품 및 후드 관리 상태" },
  { id: "electric-power", group: "전기 안전", title: "미사용 기기 전원 및 과도한 문어발식 연결 여부" },
  { id: "electric-wire", group: "전기 안전", title: "접지형 콘센트, 피복 손상 및 배선 정리 상태" },
  { id: "electric-ground", group: "전기 안전", title: "전기기기 접지 상태" },
  { id: "electric-panel", group: "전기 안전", title: "분전반 주변 접근 공간 확보 상태" },
  { id: "fire-extinguisher", group: "소방 안전", title: "소화기 위치 표시·비치 및 점검 상태" },
  { id: "fire-exit", group: "소방 안전", title: "비상구·피난 통로 확보 상태" },
  { id: "fire-access", group: "소방 안전", title: "소화전·소화기 앞 장애물 여부" },
];
// Add versions without editing an older version: saved records retain their item snapshots.
export const dailyTemplates = { "daily-v1": dailyChecklist };
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const sameData = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export const dailyAnswers = ["적합", "부적합", "해당 없음"] as const;
export const dailyAnswerLabel: Record<string, string> = { "적합": "양호", "부적합": "불량", "해당 없음": "미해당" };
export const koreaDate = (now = new Date()) => new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
export function validDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function monthDays(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}
export function inspectionStatus(row?: Inspection) {
  if (!row?.daily) return "기록 없음";
  const outcome = row.daily.mode === "na" ? "일일 미해당" : Object.values(row.results).includes("부적합") ? "불량 있음" : "점검 완료";
  return `${outcome}${row.daily.confirmation ? " · 확인 완료" : ""}`;
}
export function validateDaily(row: Inspection, existing = false) {
  const d = row.daily;
  if (!d || !validDay(d.date) || d.date > koreaDate()) throw new Error("점검일은 오늘 이전의 유효한 날짜를 선택해 주세요.");
  if (typeof d.template !== "string" || !d.template || !Array.isArray(d.items) || !d.items.length || d.items.length > 100 || d.items.some(item => !item || [item.id, item.group, item.title].some(value => typeof value !== "string" || !value.trim() || value.length > 300)) || new Set(d.items.map(item => item.id)).size !== d.items.length) throw new Error("점검 항목을 확인해 주세요.");
  if (!existing && (!Object.hasOwn(dailyTemplates, d.template) || !sameData(d.items, dailyTemplates[d.template]))) throw new Error("점검 항목 버전을 확인해 주세요.");
  if (!["check", "na"].includes(d.mode) || typeof d.labName !== "string" || !d.labName.trim() || d.labName.length > 120 || typeof d.naReason !== "string" || d.naReason.length > 2000 || typeof row.note !== "string" || row.note.length > 2000) throw new Error("점검 기본 정보를 확인해 주세요.");
  if (!d.itemNotes || typeof d.itemNotes !== "object" || Array.isArray(d.itemNotes) || !Array.isArray(d.history) || (d.editReason !== undefined && (typeof d.editReason !== "string" || d.editReason.length > 2000))) throw new Error("점검 기록 형식을 확인해 주세요.");
  if (typeof d.due !== "string" || (d.due !== "" && !validDay(d.due)) || !row.results || typeof row.results !== "object" || Array.isArray(row.results)) throw new Error("점검 결과와 기한을 확인해 주세요.");
  const ids = new Set(d.items.map(item => item.id));
  if (Object.keys(row.results).some(id => !ids.has(id)) || Object.entries(d.itemNotes).some(([id, note]) => !ids.has(id) || typeof note !== "string" || note.length > 2000)) throw new Error("점검 항목별 내용을 확인해 주세요.");
  if (d.mode === "na") {
    if (!d.naReason.trim() || Object.keys(row.results).length || Object.values(d.itemNotes).some(Boolean)) throw new Error("일일 미해당 사유를 입력하고 점검 응답은 비워 주세요.");
  } else {
    if (d.items.some(item => !(dailyAnswers as readonly string[]).includes(row.results[item.id]))) throw new Error("모든 점검 항목에 응답해 주세요.");
    if (d.items.some(item => row.results[item.id] === "부적합" && !d.itemNotes[item.id]?.trim())) throw new Error("불량 항목의 조치사항을 입력해 주세요.");
    if (Object.values(row.results).includes("부적합") && (!validDay(d.due) || d.due < d.date)) throw new Error("개선조치 기한을 점검일 이후로 지정해 주세요.");
  }
}
const payload = (row: Inspection) => ({ results: row.results, note: row.note, mode: row.daily?.mode, labName: row.daily?.labName, itemNotes: row.daily?.itemNotes, naReason: row.daily?.naReason, due: row.daily?.due });

/** Called inside the account save transaction. The client never authors review history. */
export function normalizeDaily(row: Inspection, old: Inspection | undefined, actor: { id: string; name: string; reviewing: boolean }, reason: string): Inspection {
  if (!row.daily) {
    if (old?.daily) throw new Error("일상점검 형식은 제거할 수 없습니다.");
    if (!old) throw new Error("이전 점검 양식은 새로 등록할 수 없습니다. 일상점검을 사용해 주세요.");
    if (!actor.reviewing && !sameData({ ...row, at: old.at, owner: old.owner, inspector: old.inspector }, old)) throw new Error("이전 양식 점검은 관리자가 정정합니다.");
    return { ...row, at: old.at, inspector: old.inspector };
  }
  const d = row.daily, before = old?.daily, now = new Date().toISOString();
  validateDaily(row, !!before);
  if (old && !before) throw new Error("기존 점검을 일상점검으로 변환할 수 없습니다.");
  if (before && (d.date !== before.date || d.template !== before.template || !sameData(d.items, before.items))) throw new Error("점검일과 항목은 변경할 수 없습니다.");
  if (!sameData(d.history, before?.history || [])) throw new Error("점검 확인 이력은 변경할 수 없습니다.");
  const changed = !old || !sameData(payload(row), payload(old));
  const reviewChanged = !sameData(d.confirmation, before?.confirmation);
  if (!actor.reviewing && reviewChanged) throw new Error("관리자만 점검을 확인할 수 있습니다.");
  if (actor.reviewing && reviewChanged && (changed || !d.confirmation || before?.confirmation)) throw new Error("정정 내용을 먼저 저장한 뒤 별도로 확인해 주세요.");
  const note = actor.reviewing ? reason : d.editReason?.trim() || "";
  if (old && changed && !note) throw new Error("점검 정정 사유를 입력해 주세요.");
  const next: NonNullable<Inspection["daily"]> = { date: d.date, mode: d.mode, labName: d.labName, template: d.template, items: d.items.map(({ id, group, title }) => ({ id, group, title })), itemNotes: { ...d.itemNotes }, naReason: d.naReason, due: d.due, inspectorId: before?.inspectorId || actor.id, history: [...(before?.history || [])], confirmation: before?.confirmation };
  if (changed) {
    delete next.confirmation;
    next.history.push({ at: now, actor: actor.name, event: old ? "점검 정정" : "점검 등록", note: old ? `${note}${before?.confirmation ? " · 이전 확인 해제, 재확인 필요" : ""}` : d.mode === "na" ? d.naReason : "일상점검 기록 등록" });
  } else if (reviewChanged) {
    next.confirmation = { actor: actor.name, actorId: actor.id, at: now, note: reason, recordRevision: before!.history.length };
    next.history.push({ at: now, actor: actor.name, event: "관리자 확인", note: `${reason} · 확인 대상 점검 이력 #${before!.history.length}` });
  }
  return { id: row.id, owner: row.owner, results: { ...row.results }, note: row.note, at: old?.at || now, inspector: old?.inspector || actor.name, daily: next };
}
export function newDailyActions(records: Inspection[], previous: Inspection[], actions: ActionItem[], actor: string): ActionItem[] {
  return records.flatMap(row => !row.daily || row.daily.mode === "na" ? [] : row.daily.items.filter(item => {
    const before = previous.find(old => old.id === row.id);
    return row.results[item.id] === "부적합" && before?.results[item.id] !== "부적합" && !actions.some(action => action.inspectionId === row.id && action.inspectionItem === item.id && action.status !== "종결");
  }).map(item => ({ id: `ACT-${crypto.randomUUID()}`, inspectionId: row.id, inspectionItem: item.id, title: `${item.title} 개선`, note: row.daily!.itemNotes[item.id], due: row.daily!.due, owner: row.owner, status: "조치 중" as const, history: [{ at: new Date().toISOString(), actor, event: "조치 중", note: `${row.daily!.date} 일상점검 불량: ${row.daily!.itemNotes[item.id]}` }] })));
}
export function monthlyInspectionCsv(records: Inspection[], month: string) {
  const rows: (string | number)[][] = [["점검일", "상태", "연구실", "점검자", "분류", "점검항목", "결과", "조치사항", "미해당 사유", "메모", "확인자", "확인일시", "확인 의견", "서버 등록일시", "항목 버전", "확인 대상 이력 번호"]];
  for (const day of monthDays(month)) {
    if (day > koreaDate()) continue;
    const record = records.find(row => row.daily?.date === day), daily = record?.daily;
    if (!record || !daily) { rows.push([day, "기록 없음", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]); continue; }
    for (const item of daily.mode === "na" ? [{ id: "", group: "", title: "일일 미해당" }] : daily.items) rows.push([day, inspectionStatus(record), daily.labName, record.inspector || "미기재", item.group, item.title, dailyAnswerLabel[record.results[item.id]] || "미해당", daily.itemNotes[item.id] || "", daily.naReason, record.note, daily.confirmation?.actor || "미확인", daily.confirmation?.at || "", daily.confirmation?.note || "", record.at, daily.template, daily.confirmation?.recordRevision || ""]);
  }
  return rows.map(row => row.map(value => { let text = String(value); if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; }).join(",")).join("\r\n");
}
