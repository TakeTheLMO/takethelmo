import { expect, it } from "vitest";
import { recoveryCopies, saveRecoveryCopy } from "./recovery";
import { emptyWorkspace, prepareWorkspaceState } from "../workspace/state";
it("archives old and successive recovery copies without overwriting their contents", () => {
  const rows = new Map<string, string>();
  const storage = { get length() { return rows.size; }, getItem: (key: string) => rows.get(key) || null, setItem: (key: string, value: string) => { rows.set(key, value); }, key: (i: number) => [...rows.keys()][i] || null };
  const original = emptyWorkspace("researcher"); original.assessment = { animal: "모르겠어요" };
  storage.setItem("account:conflict-backup", JSON.stringify(original));
  const first = { ...original, assessment: { animal: "예" } }, latest = { ...original, assessment: { animal: "아니요" } };
  saveRecoveryCopy(storage, "account", first); saveRecoveryCopy(storage, "account", latest);
  expect(recoveryCopies(storage, "account")).toHaveLength(3);
  expect(JSON.parse(storage.getItem("account:conflict-backup")!)).toEqual(latest);
  expect(recoveryCopies(storage, "account").map(copy => copy.state)).toEqual(expect.arrayContaining([original, first, latest]));
});
it("normalizes account data idempotently for idle sync and draft conflict baselines", () => {
  const user = { role: "researcher" as const, email: "owner@example.test" }, state = emptyWorkspace(user.role);
  state.lab = { name: "연구실", code: "", location: "", description: "" }; state.assessment = { animal: "모르겠어요" };
  const first = prepareWorkspaceState(user, state);
  expect(prepareWorkspaceState(user, first)).toEqual(first);
});
it("fails before replacing the existing backup when browser storage is full", () => {
  const original = JSON.stringify({ keep: "이전 자료" });
  const storage = { length: 1, key: () => "account:conflict-backup", getItem: () => original, setItem: () => { throw new DOMException("full", "QuotaExceededError"); } };
  expect(() => saveRecoveryCopy(storage, "account", emptyWorkspace("researcher"))).toThrow("full");
  expect(storage.getItem()).toBe(original);
});
