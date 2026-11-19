import { afterEach, describe, expect, it, vi } from "vitest";
import { createSqlite } from "../local-auth/sqlite";
import { LocalAuthStore } from "../local-auth/database";
import { AccountDataStore } from "../user-management/database";
import { emptyWorkspace } from "../workspace/state";
import type { Inspection } from "../demo/model";
import { dailyChecklist, koreaDate, monthlyInspectionCsv, validateDaily } from "./daily";
let auth: LocalAuthStore;
afterEach(async () => { await auth?.db.close(); vi.useRealTimers(); });
export function dailyFixture(): Inspection {
  return { id: "daily-one", at: "2000-01-01T00:00:00Z", owner: "researcher", inspector: "위조 이름", note: "", results: Object.fromEntries(dailyChecklist.map(item => [item.id, "적합"])), daily: {
    date: koreaDate(), mode: "check", labName: "검증 연구실", template: "daily-v1", items: dailyChecklist, itemNotes: {}, naReason: "", due: koreaDate(), inspectorId: "forged", history: [],
  } };
}
async function setup() {
  auth = new LocalAuthStore(createSqlite(":memory:")); await auth.ensureAdmin();
  const owner = await auth.register("실제 점검자", "daily@example.test", "password123"), admin = await auth.login("admin", "admin");
  const store = new AccountDataStore(auth.db), state = emptyWorkspace(owner.role); state.inspections = [dailyFixture()];
  return { owner, admin, store, state };
}
describe("daily inspection record integrity and monthly sheet", () => {
  it("sets real inspector and server time, generates corrective actions once, and preserves confirmations through edits", async () => {
    const { owner, admin, store, state } = await setup();
    state.inspections[0].results[dailyChecklist[0].id] = "부적합";
    state.inspections[0].daily!.itemNotes[dailyChecklist[0].id] = "게시 상태 확인 필요";
    const first = await store.save(owner.id, state, 0);
    expect(first.state.inspections[0]).toMatchObject({ inspector: owner.name, daily: { inspectorId: owner.id } });
    expect(first.state.inspections[0].at).not.toBe("2000-01-01T00:00:00Z");
    expect(first.state.actions).toHaveLength(1);
    await store.save(owner.id, first.state, 1);
    expect((await store.snapshot(owner.id)).state?.actions).toHaveLength(1);
    await store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 2, fields: { confirm: true }, reason: "내용 확인, 개선조치는 별도 진행" });
    const checked = (await store.snapshot(owner.id)).state!;
    expect(checked.inspections[0].daily?.confirmation).toMatchObject({ actorId: admin.id, recordRevision: 1 });
    expect(checked.actions[0].status).toBe("조치 중");
    const changed = structuredClone(checked); changed.inspections[0].note = "누락 내용 보완"; changed.inspections[0].daily!.editReason = "현장 확인";
    await store.save(owner.id, changed, 3);
    const edited = (await store.snapshot(owner.id)).state!;
    expect(edited.inspections[0].daily?.confirmation).toBeUndefined();
    expect(edited.inspections[0].daily?.history.map(row => row.event)).toEqual(["점검 등록", "관리자 확인", "점검 정정"]);
    await store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 4, fields: { confirm: true }, reason: "재확인" });
    await store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 5, fields: { note: "관리자 정정" }, reason: "오탈자 확인" });
    expect((await store.snapshot(owner.id)).state?.inspections[0].daily?.confirmation).toBeUndefined();
    expect((await store.detail(admin.id, owner.id)).history.some(row => row.reason === "재확인")).toBe(true);
  });
  it("rejects duplicate days, future or incomplete checklists, forged confirmations and mutable history", async () => {
    const { owner, store, state } = await setup();
    await expect(store.save(owner.id, { ...state, inspections: [state.inspections[0], { ...state.inspections[0], id: "different" }] }, 0)).rejects.toThrow("같은 날짜");
    const incomplete = structuredClone(state.inspections[0]); delete incomplete.results[dailyChecklist[0].id]; expect(() => validateDaily(incomplete)).toThrow("모든 점검");
    const future = structuredClone(state.inspections[0]); future.daily!.date = "2999-12-31"; expect(() => validateDaily(future)).toThrow("오늘 이전");
    const forged = structuredClone(state); forged.inspections[0].daily!.confirmation = { actor: "admin", actorId: "admin", at: new Date().toISOString(), note: "위조", recordRevision: 1 };
    await expect(store.save(owner.id, forged, 0)).rejects.toThrow("관리자만");
    const saved = (await store.save(owner.id, state, 0)).state;
    const altered = structuredClone(saved); altered.inspections[0].daily!.history[0].actor = "admin";
    await expect(store.save(owner.id, altered, 1)).rejects.toThrow("이력");
    const removed = structuredClone(saved); delete removed.inspections[0].daily;
    await expect(store.save(owner.id, removed, 1)).rejects.toThrow("제거");
  });
  it("accepts reasoned N/A and exports long-form source snapshots with safe cells and registration timestamps", async () => {
    const { owner, store, state } = await setup();
    const row = state.inspections[0]; row.daily!.mode = "na"; row.results = {};
    expect(() => validateDaily(row)).toThrow("미해당 사유");
    row.daily!.naReason = "=HYPERLINK(1)"; row.daily!.labName = "\t위험 셀";
    const saved = (await store.save(owner.id, state, 0)).state.inspections;
    const csv = monthlyInspectionCsv(saved, koreaDate().slice(0, 7));
    expect(csv).toContain('"\'=HYPERLINK(1)"'); expect(csv).toContain('"\'\t위험 셀"');
    expect(csv).toContain("일일 미해당"); expect(csv).toContain(saved[0].at); expect(csv).toContain("daily-v1");
    expect(csv.split("\r\n")).toHaveLength(Number(koreaDate().slice(-2)) + 1);
  });
  it("uses Korean date boundaries and rejects impossible calendar days", async () => {
    expect(koreaDate(new Date("2026-11-16T14:59:59Z"))).toBe("2026-11-16");
    expect(koreaDate(new Date("2026-11-16T15:00:00Z"))).toBe("2026-11-17");
    const row = dailyFixture(); row.daily!.date = "2026-02-30"; expect(() => validateDaily(row)).toThrow("유효한 날짜");
  });
  it("preserves confirmation when maps are reordered or unrelated records change and discards unsupported keys", async () => {
    const { owner, admin, store, state } = await setup();
    state.lab = { name: "연구실", location: "1층", code: "L1", description: "" };
    await store.save(owner.id, state, 0);
    await store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 1, fields: { confirm: true }, reason: "확인" });
    const checked = structuredClone((await store.snapshot(owner.id)).state!);
    checked.inspections[0].results = Object.fromEntries(Object.entries(checked.inspections[0].results).reverse());
    Object.assign(checked.inspections[0].daily!, { unsupportedApproval: "권한 아님" });
    const saved = (await store.save(owner.id, checked, 2)).state;
    expect(saved.inspections[0].daily?.confirmation).toBeTruthy();
    expect(saved.inspections[0].daily).not.toHaveProperty("unsupportedApproval");
    await store.updateRecord(admin.id, owner.id, { category: "lab", key: "lab", revision: 3, fields: { location: "2층" }, reason: "다른 기록 정정" });
    expect((await store.snapshot(owner.id)).state?.inspections[0].daily?.history).toEqual(saved.inspections[0].daily?.history);
  });
  it("uses target-record freshness for admin confirmation when only drafts advanced account revision", async () => {
    const { owner, admin, store, state } = await setup();
    const saved = (await store.save(owner.id, state, 0)).state;
    await store.save(owner.id, { ...saved, assessment: { animal: "모르겠어요" } }, 1);
    await store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 1, original: saved.inspections[0], fields: { confirm: true }, reason: "조회한 내용 확인" });
    expect((await store.snapshot(owner.id)).state?.assessment.animal).toBe("모르겠어요");
    await expect(store.updateRecord(admin.id, owner.id, { category: "inspections", key: "daily-one", revision: 1, original: saved.inspections[0], fields: { note: "오래된 화면에서 정정" }, reason: "위험한 덮어쓰기" })).rejects.toThrow("다른 변경");
  });
  it("preserves retired item snapshots and legacy dates while rejecting new obsolete-format records", async () => {
    const { owner, store, state } = await setup();
    const legacy: Inspection = { id: "old", at: "2026-10-01T00:00:00Z", owner: owner.role, results: { old: "적합" }, note: "이전 기록" };
    await expect(store.save(owner.id, { ...state, inspections: [legacy] }, 0)).rejects.toThrow("새로 등록");
    const historical = structuredClone(state); historical.inspections = [legacy, historical.inspections[0]];
    const daily = historical.inspections[1]; Object.assign(daily.daily!, { template: "retired-v0", items: [{ id: "old", group: "과거", title: "과거 항목" }] }); daily.results = { old: "적합" };
    await auth.db.run("INSERT INTO account_data VALUES (?,?,?,?)", owner.id, JSON.stringify(historical), 1, new Date().toISOString());
    const current = (await store.snapshot(owner.id)).state!; current.inspections[0].at = "2999-01-01";
    const result = (await store.save(owner.id, current, 1)).state;
    expect(result.inspections[0].at).toBe(legacy.at); expect(result.inspections[1].daily?.items[0].title).toBe("과거 항목");
  });
});
