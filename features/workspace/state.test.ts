import { describe, expect, it } from "vitest";
import { createSeed } from "../demo/data";
import { validState } from "../demo/validation";
import { emptyWorkspace, prepareWorkspaceState } from "./state";
import { portalHref } from "@/config/workspace";
describe("포털 이관", () => {
  it("새 계정은 유효한 빈 자료로 시작한다", () => {
    const state = emptyWorkspace("researcher");
    expect(validState(state)).toBe(true); expect(state.requests).toEqual([]); expect(state.courses).toEqual([]);
  });
  it("기존 미수정 예제만 제거하고 실제 작성 자료와 문의 초안을 보존한다", () => {
    const state = createSeed();
    state.requests.push({ ...state.requests[0], id: "actual", title: "작성한 신청" });
    state.ledger.push({ ...state.ledger[0], id: "actual-ledger", label: "기록한 물질" });
    const live = prepareWorkspaceState({ role: "lmo_manager", email: "real@example.com" }, state);
    expect(live.requests.map(row => row.id)).toEqual(["actual"]);
    expect(live.ledger.map(row => row.id)).toEqual(["actual-ledger"]);
    expect(live.requests[0].owner).toBe("lmo_manager"); expect(live.courses).toEqual([]);
  });
  it("명시한 예시 계정과 예전 링크는 보존한다", () => {
    expect(prepareWorkspaceState({ role: "researcher", email: "sample.researcher1@example.test" }, createSeed()).requests).toHaveLength(2);
    expect(portalHref("/demo/requests?kind=ibc")).toBe("/mypage/requests?kind=ibc");
    expect(portalHref("/demo/assessment")).toBe("/lmo/assessment");
  });
});
