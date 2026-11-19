import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalAuthStore } from "../local-auth/database";
import { AccountDataStore } from "../user-management/database";
import { emptyWorkspace } from "../workspace/state";
import type { Inspection } from "../demo/model";
import { dailyChecklist, koreaDate, monthlyInspectionCsv, validateDaily } from "./daily";
let auth: LocalAuthStore;
afterEach(() => { if (auth?.db.isOpen) auth.db.close(); vi.useRealTimers(); });
export function dailyFixture(): Inspection {
  return { id: "daily-one", at: "2000-01-01T00:00:00Z", owner: "researcher", inspector: "위조 이름", note: "", results: Object.fromEntries(dailyChecklist.map(item => [item.id, "적합"])), daily: {
    date: koreaDate(), mode: "check", labName: "검증 연구실", template: "daily-v1", items: dailyChecklist, itemNotes: {}, naReason: "", due: koreaDate(), inspectorId: "forged", history: [],
  } };
}
function setup() {
  auth = new LocalAuthStore(":memory:"); auth.ensureAdmin();
  const owner = auth.register("실제 점검자", "daily@example.test", "password123"), admin = auth.login("admin", "admin");
  const store = new AccountDataStore(auth.db), state = emptyWorkspace(owner.role); state.inspections = [dailyFixture()];
  return { owner, admin, store, state };
}
describe("daily inspection record integrity and monthly sheet", () => {
  it("sets real inspector and server time, generates corrective actions once, and preserves confirmations through edits", () => {
    const { owner, admin, store, state } = setup();
    state.inspections[0].results[dailyChecklist[0].id] = "부적합";
    state.inspections[0].daily!.itemNotes[dailyChecklist[0].id] = "게시 상태 확인 필요";
    const first = store.save(owner.id, state, 0);
    expect(first.state.inspections[0]).toMatchObject({ inspector: owner.name, daily: { inspectorId: owner.id } });
    expect(first.state.inspections[0].at).not.toBe("2000-01-01T00:00:00Z");
    expect(first.state.actions).toHaveLength(1);
    store.save(owner.id, first.state, 1);
    expect(store.snapshot(owner.id).state?.actions).toHaveLength(1);
    store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 2, fields: { confirm: true }, reason: "내용 확인, 개선조치는 별도 진행" });
    const checked = store.snapshot(owner.id).state!;
    expect(checked.inspections[0].daily?.confirmation).toMatchObject({ actorId: admin.id, recordRevision: 1 });
    expect(checked.actions[0].status).toBe("조치 중");
    const changed = structuredClone(checked); changed.inspections[0].note = "누락 내용 보완"; changed.inspections[0].daily!.editReason = "현장 확인";
    store.save(owner.id, changed, 3);
    const edited = store.snapshot(owner.id).state!;
    expect(edited.inspections[0].daily?.confirmation).toBeUndefined();
    expect(edited.inspections[0].daily?.history.map(row => row.event)).toEqual(["점검 등록", "관리자 확인", "점검 정정"]);
    store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 4, fields: { confirm: true }, reason: "재확인" });
    store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 5, fields: { note: "관리자 정정" }, reason: "오탈자 확인" });
    expect(store.snapshot(owner.id).state?.inspections[0].daily?.confirmation).toBeUndefined();
    expect(store.detail(admin.id, owner.id).history.some(row => row.reason === "재확인")).toBe(true);
  });
  it("rejects duplicate days, future or incomplete checklists, forged confirmations and mutable history", () => {
    const { owner, store, state } = setup();
    expect(() => store.save(owner.id, { ...state, inspections: [state.inspections[0], { ...state.inspections[0], id: "different" }] }, 0)).toThrow("같은 날짜");
    const incomplete = structuredClone(state.inspections[0]); delete incomplete.results[dailyChecklist[0].id]; expect(() => validateDaily(incomplete)).toThrow("모든 점검");
    const future = structuredClone(state.inspections[0]); future.daily!.date = "2999-12-31"; expect(() => validateDaily(future)).toThrow("오늘 이전");
    const forged = structuredClone(state); forged.inspections[0].daily!.confirmation = { actor: "admin", actorId: "admin", at: new Date().toISOString(), note: "위조", recordRevision: 1 };
    expect(() => store.save(owner.id, forged, 0)).toThrow("관리자만");
    const saved = store.save(owner.id, state, 0).state;
    const altered = structuredClone(saved); altered.inspections[0].daily!.history[0].actor = "admin";
    expect(() => store.save(owner.id, altered, 1)).toThrow("이력");
    const removed = structuredClone(saved); delete removed.inspections[0].daily;
    expect(() => store.save(owner.id, removed, 1)).toThrow("제거");
  });
  it("accepts reasoned N/A and exports long-form source snapshots with safe cells and registration timestamps", () => {
    const { owner, store, state } = setup();
    const row = state.inspections[0]; row.daily!.mode = "na"; row.results = {};
    expect(() => validateDaily(row)).toThrow("미해당 사유");
    row.daily!.naReason = "=HYPERLINK(1)"; row.daily!.labName = "\t위험 셀";
    const saved = store.save(owner.id, state, 0).state.inspections;
    const csv = monthlyInspectionCsv(saved, koreaDate().slice(0, 7));
    expect(csv).toContain('"\'=HYPERLINK(1)"'); expect(csv).toContain('"\'\t위험 셀"');
    expect(csv).toContain("일일 미해당"); expect(csv).toContain(saved[0].at); expect(csv).toContain("daily-v1");
    expect(csv.split("\r\n")).toHaveLength(Number(koreaDate().slice(-2)) + 1);
  });
  it("uses Korean date boundaries and rejects impossible calendar days", () => {
    expect(koreaDate(new Date("2026-11-16T14:59:59Z"))).toBe("2026-11-16");
    expect(koreaDate(new Date("2026-11-16T15:00:00Z"))).toBe("2026-11-17");
    const row = dailyFixture(); row.daily!.date = "2026-02-30"; expect(() => validateDaily(row)).toThrow("유효한 날짜");
  });
  it("preserves confirmation when maps are reordered or unrelated records change and discards unsupported keys", () => {
    const { owner, admin, store, state } = setup();
    state.lab = { name: "연구실", location: "1층", code: "L1", description: "" };
    store.save(owner.id, state, 0);
    store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 1, fields: { confirm: true }, reason: "확인" });
    const checked = structuredClone(store.snapshot(owner.id).state!);
    checked.inspections[0].results = Object.fromEntries(Object.entries(checked.inspections[0].results).reverse());
    Object.assign(checked.inspections[0].daily!, { unsupportedApproval: "권한 아님" });
    const saved = store.save(owner.id, checked, 2).state;
    expect(saved.inspections[0].daily?.confirmation).toBeTruthy();
    expect(saved.inspections[0].daily).not.toHaveProperty("unsupportedApproval");
    store.updateRecord(admin.id, owner.id, { category: "lab", key: "lab", revision: 3, fields: { location: "2층" }, reason: "다른 기록 정정" });
    expect(store.snapshot(owner.id).state?.inspections[0].daily?.history).toEqual(saved.inspections[0].daily?.history);
  });
  it("uses target-record freshness for admin confirmation when only drafts advanced account revision", () => {
    const { owner, admin, store, state } = setup();
    const saved = store.save(owner.id, state, 0).state;
    store.save(owner.id, { ...saved, assessment: { animal: "모르겠어요" } }, 1);
    store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 1, original: saved.inspections[0], fields: { confirm: true }, reason: "조회한 내용 확인" });
    expect(store.snapshot(owner.id).state?.assessment.animal).toBe("모르겠어요");
    expect(() => store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 1, original: saved.inspections[0], fields: { note: "오래된 화면에서 정정" }, reason: "위험한 덮어쓰기" })).toThrow("다른 변경");
  });
  it("preserves retired item snapshots and legacy dates while rejecting new obsolete-format records", () => {
    const { owner, store, state } = setup();
    const legacy: Inspection = { id: "old", at: "2026-10-01T00:00:00Z", owner: owner.role, results: { old: "적합" }, note: "이전 기록" };
    expect(() => store.save(owner.id, { ...state, inspections: [legacy] }, 0)).toThrow("새로 등록");
    const historical = structuredClone(state); historical.inspections = [legacy, historical.inspections[0]];
    const daily = historical.inspections[1]; Object.assign(daily.daily!, { template: "retired-v0", items: [{ id: "old", group: "과거", title: "과거 항목" }] }); daily.results = { old: "적합" };
    auth.db.prepare("INSERT INTO account_data VALUES (?,?,?,?)").run(owner.id, JSON.stringify(historical), 1, new Date().toISOString());
    const current = store.snapshot(owner.id).state!; current.inspections[0].at = "2999-01-01";
    const result = store.save(owner.id, current, 1).state;
    expect(result.inspections[0].at).toBe(legacy.at); expect(result.inspections[1].daily?.items[0].title).toBe("과거 항목");
  });
});
