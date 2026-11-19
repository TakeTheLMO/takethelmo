import { expect, it } from "vitest";
import { emptyWorkspace } from "../workspace/state";
import { rebaseDraftChanges, reconcileSavedState } from "./reconcile";
import type { RequestDraft } from "../demo/model";
const draft: RequestDraft = { title: "작성 중인 문의", body: "입력 내용", updatedAt: "2026-11-17", inquiry: { experimentType: "", materials: "", plannedStart: "", startUnknown: true, previousFiling: "모르겠어요", filingInfo: "", overview: "" } };
it("keeps pending draft text and canonical new workflow history during an in-flight save", () => {
  const sent = emptyWorkspace("researcher");
  sent.requests = [{ id: "request", kind: "연구실 출입", title: "제출", body: "내용", status: "제출", owner: "researcher", history: [{ at: "client-time", actor: "client", event: "제출", note: "입력" }] }];
  const saved = structuredClone(sent); saved.requests[0].history[0] = { ...saved.requests[0].history[0], actor: "실제 사용자", at: "server-time" };
  const pending = { ...sent, requestDrafts: { inquiry: draft } };
  const result = reconcileSavedState(sent, saved, pending);
  expect(result.requests[0].history[0].at).toBe("server-time"); expect(result.requestDrafts?.inquiry.title).toBe(draft.title);
});
it("rebases independent draft edits over administrator changes without reverting those changes", () => {
  const base = emptyWorkspace("researcher"), local = { ...base, requestDrafts: { inquiry: draft } }, remote = { ...base, lab: { name: "관리자 확인", code: "L1", location: "1층", description: "변경" } };
  const result = rebaseDraftChanges(base, local, remote);
  expect(result?.lab).toEqual(remote.lab); expect(result?.requestDrafts?.inquiry).toEqual(draft);
  expect(rebaseDraftChanges(base, local, { ...remote, requestDrafts: { inquiry: { ...draft, title: "다른 창의 수정" } } })).toBeNull();
});
it("does not automatically rebase workflow mutations or an unknown initial offline base", () => {
  const base = emptyWorkspace("researcher");
  expect(rebaseDraftChanges(base, { ...base, assessment: { animal: "예" } }, base)).toBeNull();
  expect(rebaseDraftChanges(null, base, base)).toBeNull();
});
