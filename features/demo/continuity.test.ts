import { expect, it } from "vitest";
import { reviseLedger, latestDraftKind } from "./continuity";
import { createSeed } from "./data";
import { decodeState } from "./persistence";
import { inquiryBody, type RequestDraft } from "./model";
import type { LmoLedger } from "./model";
it("새 대장의 수량·단위 정정을 누적하며 이전 이력을 바꾸지 않는다", () => {
  const original: LmoLedger = {
    id: "new",
    format: "lmo",
    type: "LMO",
    label: "가상 대상",
    origin: "확인 필요",
    recordedDate: "2026-11-17",
    received: 1,
    used: 0,
    stored: 1,
    unit: "vial",
    notes: "",
    at: new Date().toISOString(),
    actor: "원 작성자",
  };
  const first = reviseLedger(
    original,
    original,
    { ...original, stored: 2, notes: "배양" },
    "lmo_manager",
    "수량 정정",
  );
  const second = reviseLedger(
    first,
    first,
    { ...first, unit: "tube" as const },
    "safety_admin",
    "단위 오기 정정",
  );
  expect(second.revisions).toHaveLength(2);
  expect(second.revisions![0]).toEqual(first.revisions![0]);
  expect(second.revisions![1].before).toMatchObject({
    stored: 2,
    unit: "vial",
  });
  expect(second.revisions![1].after).toMatchObject({ stored: 2, unit: "tube" });
  expect(() =>
    reviseLedger(
      first,
      first,
      { ...first, stored: -1 } as LmoLedger,
      "lmo_manager",
      "오류",
    ),
  ).toThrow();
});
it("정정은 원본과 이력을 보존하고 권한·사유·동시 변경을 검사한다", () => {
  const base = createSeed().ledger[0];
  const edited = { ...base, label: "정정한 대상" };
  expect(() =>
    reviseLedger(base, base, edited, "researcher", "오타"),
  ).toThrow();
  expect(() => reviseLedger(base, base, edited, "lmo_manager", " ")).toThrow();
  const changed = reviseLedger(
    base,
    base,
    edited,
    "lmo_manager",
    "명칭 오타 정정",
  );
  expect(base.label).not.toBe(changed.label);
  expect(changed.revisions![0].before).toEqual(base);
  expect(changed.at).toBe(base.at);
  expect(() =>
    reviseLedger(changed, base, edited, "lmo_manager", "중복 정정"),
  ).toThrow();
  expect(
    decodeState(JSON.stringify({ ...createSeed(), ledger: [changed] }))
      .ledger[0],
  ).toEqual(changed);
});
it("초안과 응답 사본을 저장·복원하고 문의 본문에도 포함한다", () => {
  const draft: RequestDraft = {
    title: "진행 중",
    body: "",
    updatedAt: new Date().toISOString(),
    inquiry: {
      experimentType: "",
      materials: "",
      plannedStart: "",
      startUnknown: false,
      previousFiling: "모르겠어요",
      filingInfo: "",
      overview: "내가 쓴 내용",
      assessment: { animal: "아니요" },
    },
  };
  const state = decodeState(
    JSON.stringify({
      ...createSeed(),
      requestDrafts: { "researcher:IBC 사전 문의": draft },
    }),
  );
  expect(state.requestDrafts!["researcher:IBC 사전 문의"]).toEqual(draft);
  expect(latestDraftKind(state.requestDrafts, "researcher")).toBe(
    "IBC 사전 문의",
  );
  expect(latestDraftKind(state.requestDrafts, "lmo_manager")).toBeUndefined();
  expect(inquiryBody(draft.inquiry)).toContain(
    "동물에게 물질을 투여하는 실험이 포함되나요? 아니요",
  );
});
