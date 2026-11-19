import { afterEach, describe, expect, it, vi } from "vitest";
import { createSqlite } from "../local-auth/sqlite";
import { LocalAuthStore } from "../local-auth/database";
import { AccountDataStore } from "./database";
import { emptyWorkspace, prepareWorkspaceState } from "../workspace/state";
import { reviseLedger } from "../demo/continuity";
import { INQUIRY_KIND, type LmoLedger, type InquiryDetails } from "../demo/model";
import { PortalContentStore } from "../portal-content/database";
let auth: LocalAuthStore;
afterEach(() => auth?.db.close());
async function setup(role = "researcher") {
  auth = new LocalAuthStore(createSqlite(":memory:")); await auth.ensureAdmin();
  return { owner: await auth.register("실제 사용자", "actual@example.test", "password123", role), admin: await auth.login("admin", "admin"), store: new AccountDataStore(auth.db) };
}
describe("account workflow regression guards", () => {
  it("denies administration for all public job roles and legacy system-admin labels", async () => {
    const { owner, store, admin } = await setup();
    await store.putFile(owner.id, "proof", "proof.pdf", "application/pdf", Buffer.from("proof"));
    const content = new PortalContentStore(auth.db);
    for (const role of ["researcher", "lab_manager", "lmo_manager", "safety_admin", "super_admin"] as const) {
      const registered = await auth.register(`검증 ${role}`, `${role}@example.test`, "password123", role === "super_admin" ? "safety_admin" : role);
      if (role === "super_admin") await auth.db.run("UPDATE local_users SET role=? WHERE id=?", role, registered.id);
      const user = await auth.login(registered.email, "password123");
      expect(user.canSwitchRole).toBe(false);
      for (const run of [() => store.users(user.id), () => store.allRecords(user.id), () => store.allFiles(user.id), () => store.activity(user.id), () => store.file(user.id, owner.id, "proof"), () => store.updateUser(user.id, owner.id, {}), () => content.admin(user.id)]) await expect(run()).rejects.toThrow("관리자");
    }
    const original = (await store.detail(admin.id, owner.id)).user;
    await expect(store.updateUser(admin.id, owner.id, { original, name: owner.name, email: owner.email, role: "super_admin", active: true, reason: "권한 변경" })).rejects.toThrow("일반 계정");
  });
  it("requires owner files with exact metadata and prevents evidence substitution after review", async () => {
    const { owner, store, admin } = await setup(), state = emptyWorkspace(owner.role);
    const other = await auth.register("다른 연구자", "other@example.test", "password123");
    await store.putFile(other.id, "proof", "proof.pdf", "application/pdf", Buffer.from("proof"));
    state.actions.push({ id: "action", title: "점검 조치", note: "원래 내용", status: "조치 중", owner: owner.role, due: "2026-12-01", history: [{ actor: "가짜", at: "2000-01-01", event: "조치 중", note: "발견" }] });
    const saved = (await store.save(owner.id, state, 0)).state;
    expect(saved.actions[0].history[0].actor).toBe(owner.name); expect(saved.actions[0].history[0].at).not.toBe("2000-01-01");
    const submitted = structuredClone(saved); submitted.actions[0].status = "검토 대기"; submitted.actions[0].file = { id: "proof", name: "proof.pdf", type: "application/pdf", size: 5 }; submitted.actions[0].history.push({ actor: owner.name, at: "2000-01-01", event: "검토 대기", note: "조치 증빙 제출" });
    await expect(store.save(owner.id, submitted, 1)).rejects.toThrow("본인 계정");
    await store.putFile(owner.id, "proof", "proof.pdf", "application/pdf", Buffer.from("proof"));
    const wrongSize = structuredClone(submitted); wrongSize.actions[0].file!.size = 100;
    await expect(store.save(owner.id, wrongSize, 1)).rejects.toThrow("파일 정보");
    await store.save(owner.id, submitted, 1);
    await store.updateRecord(admin.id, owner.id, { category: "actions", key: "action", revision: 2, fields: { status: "종결" }, reason: "원본 확인" });
    const closed = structuredClone((await store.snapshot(owner.id)).state!); closed.actions[0].note = "종결 후 교체";
    await expect(store.save(owner.id, closed, 3)).rejects.toThrow("직접 변경");
    closed.actions[0].history.push({ actor: owner.name, at: new Date().toISOString(), event: "종결", note: "위조" });
    await expect(store.save(owner.id, closed, 3)).rejects.toThrow();
    expect((await store.snapshot(owner.id)).state?.actions[0].note).toBe("원래 내용");
  });
  it("locks reviewed incidents and rejects duplicate identifiers", async () => {
    const { owner, store, admin } = await setup(), state = emptyWorkspace(owner.role);
    const incident = { id: "incident", title: "확인 요청", kind: "아차사고", place: "연구실", body: "사후 기록", occurredAt: "2026-11-17T09:00", owner: owner.role, status: "접수" as const, history: [{ at: new Date().toISOString(), actor: owner.name, event: "접수", note: "보고" }] };
    state.incidents = [incident, incident]; await expect(store.save(owner.id, state, 0)).rejects.toThrow("중복");
    state.incidents = [incident]; await store.save(owner.id, state, 0);
    await store.updateRecord(admin.id, owner.id, { category: "incidents", key: "incident", revision: 1, fields: { status: "확인 중" }, reason: "현장 확인" });
    const edited = (await store.snapshot(owner.id)).state!; edited.incidents[0].body = "덮어쓰기";
    await expect(store.save(owner.id, edited, 2)).rejects.toThrow("직접 변경");
  });
  it("allows unrelated corrections to legacy missing evidence but requires an original for a new closure", async () => {
    const { owner, store, admin } = await setup(), state = emptyWorkspace(owner.role);
    state.actions = [{ id: "legacy-proof", title: "과거 조치", note: "기록 유지", status: "검토 대기", owner: owner.role, due: "2026-12-01", file: { id: "lost", name: "lost.pdf", size: 4, type: "application/pdf" }, history: [{ actor: owner.name, at: "2026-10-01", event: "검토 대기", note: "이전 자료" }] }];
    await auth.db.run("INSERT INTO account_data VALUES (?,?,?,?)", owner.id, JSON.stringify(state), 1, new Date().toISOString());
    await store.updateRecord(admin.id, owner.id, { category: "actions", key: "legacy-proof", revision: 1, fields: { title: "제목 오탈자 정정" }, reason: "내용만 정정" });
    await expect(store.updateRecord(admin.id, owner.id, { category: "actions", key: "legacy-proof", revision: 2, fields: { status: "종결" }, reason: "원본 없이 확인" })).rejects.toThrow("첨부 원본");
    await store.updateRecord(admin.id, owner.id, { category: "actions", key: "legacy-proof", revision: 2, fields: { status: "조치 중" }, reason: "원본 재첨부 요청" });
    expect((await store.snapshot(owner.id)).state?.actions[0].status).toBe("조치 중");
  });
  it("saves pre-change ledger and inspection records without converting data or blocking account role normalization", async () => {
    const { owner, store, admin } = await setup("lmo_manager"), old = emptyWorkspace("researcher");
    old.ledger = [{ id: "old-ledger", type: "LMO", label: "이전 자료", quantity: 3, unit: "vial", at: "2026-10-01", actor: "최초 작성자" }];
    old.inspections = [{ id: "old-inspection", at: "2026-10-01", owner: "researcher", results: { old: "적합" }, note: "기존 점검" }];
    old.requests = [{ id: "old-request", kind: "연구실 출입", title: "이전 신청", body: "원본 내용", owner: "researcher", status: "제출", history: [{ actor: "최초 작성자", at: "2026-10-01", event: "제출", note: "원본" }] }];
    await auth.db.run("INSERT INTO account_data VALUES (?,?,?,?)", owner.id, JSON.stringify(old), 1, new Date().toISOString());
    const normalized = prepareWorkspaceState(owner, (await store.snapshot(owner.id)).state!);
    await store.save(owner.id, normalized, 1);
    expect((await store.snapshot(owner.id)).state?.ledger[0]).toEqual(old.ledger[0]);
    await store.updateRecord(admin.id, owner.id, { category: "ledger", key: "old-ledger", revision: 2, fields: { label: "이전 자료 정정" }, reason: "확인 정정" });
    await store.updateRecord(admin.id, owner.id, { category: "inspections", key: "old-inspection", revision: 3, fields: { note: "관리자 확인 메모" }, reason: "확인" });
    expect((await store.snapshot(owner.id)).state?.inspections[0].at).toBe("2026-10-01");
    expect((await store.snapshot(owner.id)).state?.requests[0].history).toEqual(old.requests[0].history);
  });
  it("rejects a concurrent write between target comparison and the save transaction without losing the newer data", async () => {
    const { owner, store, admin } = await setup(), state = emptyWorkspace(owner.role);
    state.lab = { name: "원래 연구실", location: "1층", code: "L1", description: "" }; await store.save(owner.id, state, 0);
    const save = store.save.bind(store), original = (await store.snapshot(owner.id)).state!.lab;
    const intercepted = vi.spyOn(store, "save").mockImplementationOnce(async (user, next, revision, actor, reason) => {
      const concurrent = await store.snapshot(owner.id); concurrent.state!.assessment = { animal: "예" }; await save(owner.id, concurrent.state, concurrent.revision);
      return save(user, next, revision, actor, reason);
    });
    await expect(store.updateRecord(admin.id, owner.id, { category: "lab", key: "lab", revision: 1, original, fields: { location: "2층" }, reason: "동시 저장 검증" })).rejects.toThrow("다른 변경");
    intercepted.mockRestore();
    expect((await store.snapshot(owner.id)).state?.assessment.animal).toBe("예"); expect((await store.snapshot(owner.id)).state?.lab?.location).toBe("1층");
  });
  it("reconstructs ledger revisions from canonical old records and prevents tampering", async () => {
    const { owner, store } = await setup("lmo_manager"), state = emptyWorkspace(owner.role);
    const ledger: LmoLedger = { id: "ledger", format: "lmo", type: "LMO 취급·관리", label: "확인 물질", origin: "확인 필요", recordedDate: "2026-11-17", received: 5, used: 1, stored: 4, unit: "vial", notes: "기관 확인 필요", storageLocation: "선반 A", containerCapacity: "1 vial당 1 ml", actor: "admin", at: "2000-01-01" };
    state.ledger = [ledger]; const saved = (await store.save(owner.id, state, 0)).state;
    expect(saved.ledger[0].actor).toBe(owner.name);
    const old = saved.ledger[0] as LmoLedger;
    const revised = reviseLedger(old, old, { ...old, storageLocation: "선반 B" }, owner.role, "보관 위치 확인");
    const forged = structuredClone(revised); forged.revisions![0].before.label = "다른 기록";
    await expect(store.save(owner.id, { ...saved, ledger: [forged] }, 1)).rejects.toThrow("실제 수정 전후");
    revised.revisions![0].actor = "admin"; revised.revisions![0].at = "2000-01-01";
    const changed = (await store.save(owner.id, { ...saved, ledger: [revised] }, 1)).state;
    expect(changed.ledger[0].revisions?.[0].actor).toBe(owner.name);
    const deleted = structuredClone(changed); deleted.ledger[0].revisions = [];
    await expect(store.save(owner.id, deleted, 2)).rejects.toThrow("기존 대장 정정 이력");
    const altered = structuredClone(changed); altered.ledger[0].revisions![0].reason = "이력 바꿈";
    await expect(store.save(owner.id, altered, 2)).rejects.toThrow("기존 대장 정정 이력");
  });
  it("attaches the account's complete assessment and preserves the submitted snapshot across reviews", async () => {
    const { owner, store, admin } = await setup(), state = emptyWorkspace(owner.role);
    state.assessment = { organism: "아니요", modified: "모르겠어요", facility: "아니요", animal: "아니요" };
    const inquiry: InquiryDetails = { experimentType: "사전 문의", materials: "명칭 확인 중", plannedStart: "", startUnknown: true, previousFiling: "모르겠어요", filingInfo: "", overview: "진행 전에 확인 요청", assessment: { organism: "예", modified: "예", facility: "예", animal: "예" } };
    state.requests = [{ id: "inquiry", title: "IBC 확인", kind: INQUIRY_KIND, owner: owner.role, status: "접수", body: "임의의 본문", inquiry, history: [{ actor: owner.name, at: "2000-01-01", event: "접수", note: "문의" }] }];
    const saved = (await store.save(owner.id, state, 0)).state;
    expect(saved.requests[0].inquiry?.assessment).toEqual(state.assessment); expect(saved.requests[0].body).toContain("모르겠어요");
    await store.updateRecord(admin.id, owner.id, { category: "requests", key: "inquiry", revision: 1, fields: { inquiry: { ...inquiry, overview: "내용 정정" } }, reason: "문의 정정" });
    expect((await store.snapshot(owner.id)).state?.requests[0].inquiry?.assessment).toEqual(state.assessment);
    await store.updateRecord(admin.id, owner.id, { category: "requests", key: "inquiry", revision: 2, fields: { status: "답변 준비 중" }, reason: "검토" });
    await store.updateRecord(admin.id, owner.id, { category: "requests", key: "inquiry", revision: 3, fields: { status: "추가 정보 요청" }, reason: "보완" });
    const resubmit = (await store.snapshot(owner.id)).state!; resubmit.assessment.animal = "예"; resubmit.requests[0].status = "접수"; resubmit.requests[0].inquiry!.assessment = { ...resubmit.assessment }; resubmit.requests[0].history.push({ actor: owner.name, at: new Date().toISOString(), event: "추가 정보 제출", note: "설명 보완" });
    const final = await store.save(owner.id, resubmit, 4);
    expect(final.state.requests[0].inquiry?.assessment?.animal).toBe("아니요");
  });
});
