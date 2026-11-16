import { describe, expect, it } from "vitest";
import { createSeed } from "./data";
import {
  canReview,
  history,
  INQUIRY_KIND,
  inquiryBody,
  requestComplete,
  requestNeedsOwner,
  requestNeedsReviewer,
  transitionRequest,
  type InquiryDetails,
  type LmoLedger,
  type RequestItem,
} from "./model";
import { decodeState, validState } from "./persistence";
import { ledgerCsv, validateLedger } from "./ledger";
import { getNotifications } from "./Store";
import legacy from "../../e2e/fixtures/demo-v1.json";

const details: InquiryDetails = {
  experimentType: "가상 실험",
  materials: "가상 물질 · 확인 필요",
  plannedStart: "",
  startUnknown: true,
  previousFiling: "모르겠어요",
  filingInfo: "",
  overview: "필요한 절차를 문의합니다.",
};
const inquiry = (): RequestItem => ({
  id: "inq-test",
  title: "사전 문의 테스트",
  kind: INQUIRY_KIND,
  owner: "researcher",
  status: "접수",
  inquiry: details,
  body: inquiryBody(details),
  history: [history("researcher", "접수", "제출 체험")],
});
const record: LmoLedger = {
  id: "ledger-test",
  format: "lmo",
  type: "LMO 취급·관리",
  label: "가상 물질",
  origin: "확인 필요",
  recordedDate: "2026-11-17",
  received: 1,
  used: 0,
  stored: 10,
  unit: "vial",
  notes: "배양으로 수량 증가",
  at: "2026-11-17T00:00:00Z",
  actor: "가상 담당자",
};

describe("IBC 문의와 승인 흐름 분리", () => {
  it("문의 담당 역할만 답변하고 자기 문의는 답변할 수 없다", () => {
    const item = inquiry();
    expect(canReview("lab_manager", item)).toBe(false);
    expect(canReview("researcher", item)).toBe(false);
    expect(canReview("lmo_manager", item)).toBe(true);
    expect(canReview("safety_admin", item)).toBe(true);
    expect(canReview("lmo_manager", { ...item, owner: "lmo_manager" })).toBe(
      false,
    );
    expect(() =>
      transitionRequest(item, "lab_manager", "답변 준비 중", "확인"),
    ).toThrow();
    expect(() =>
      transitionRequest(item, "lmo_manager", "승인", "확인"),
    ).toThrow();
  });
  it("추가 정보 요청·재제출·답변의 내용, 알림, 대기 상태를 일치시킨다", () => {
    let item = inquiry();
    const notifications = (r: RequestItem) =>
      getNotifications({
        ...createSeed(),
        role: "lmo_manager",
        requests: [r],
      }).filter((n) => n.id.startsWith("review-"));
    expect(notifications(item)).toHaveLength(1);
    item = transitionRequest(item, "lmo_manager", "답변 준비 중", "내용 확인");
    expect(() =>
      transitionRequest(item, "lmo_manager", "반려", "확인"),
    ).toThrow();
    item = transitionRequest(
      item,
      "lmo_manager",
      "추가 정보 요청",
      "자료 유무를 알려 주세요.",
    );
    expect(requestNeedsOwner(item)).toBe(true);
    expect(requestNeedsReviewer(item)).toBe(false);
    expect(notifications(item)).toHaveLength(0);
    expect(() =>
      transitionRequest(item, "researcher", "접수", "보완", undefined, {
        ...details,
        materials: " ",
      }),
    ).toThrow();
    item = transitionRequest(
      item,
      "researcher",
      "접수",
      "자료 확인",
      undefined,
      { ...details, materials: "자료 있음" },
    );
    expect(item.body).toContain("자료 있음");
    expect(notifications(item)).toHaveLength(1);
    item = transitionRequest(item, "safety_admin", "답변 준비 중", "확인");
    item = transitionRequest(
      item,
      "safety_admin",
      "답변 완료",
      "기관의 정식 절차를 확인하세요.",
    );
    expect(requestComplete(item)).toBe(true);
    expect(notifications(item)).toHaveLength(0);
    expect(item.history.map((h) => h.event)).toEqual([
      "접수",
      "답변 준비 중",
      "추가 정보 요청",
      "추가 정보 제출",
      "답변 준비 중",
      "답변 완료",
    ]);
  });
  it("저장 검증기가 문의·승인 상태 혼합을 거부하되 예전 본문 문구는 허용한다", () => {
    const seed = createSeed();
    expect(validState({ ...seed, requests: [inquiry()] })).toBe(true);
    expect(
      validState({ ...seed, requests: [{ ...inquiry(), status: "승인" }] }),
    ).toBe(false);
    expect(
      validState({ ...seed, requests: [{ ...inquiry(), inquiry: undefined }] }),
    ).toBe(false);
    expect(
      validState({
        ...seed,
        requests: [{ ...inquiry(), body: "이전 버전 안내 문구" }],
      }),
    ).toBe(true);
    expect(
      validState({
        ...seed,
        requests: [{ ...seed.requests[0], status: "접수" }],
      }),
    ).toBe(false);
  });
});
describe("대장과 저장 데이터 보존", () => {
  it("수정하지 않은 v1 원본 시드를 그대로 읽는다", () => {
    expect(decodeState(JSON.stringify(legacy))).toEqual({
      ...legacy,
      version: 2,
    });
  });
  it("변경 전 v1 시드의 모든 기존 기록을 해석 없이 보존하고 새 항목과 함께 재저장한다", () => {
    const original = {
      ...legacy,
      assessment: {
        organism: "예",
        modified: "아니요",
        facility: "모르겠어요",
      },
    };
    const migrated = decodeState(JSON.stringify(original));
    expect(migrated).toEqual({ ...original, version: 2 });
    expect(migrated.assessment.animal).toBeUndefined();
    const saved = decodeState(
      JSON.stringify({
        ...migrated,
        ledger: [record, ...migrated.ledger],
        requests: [inquiry(), ...migrated.requests],
      }),
    );
    expect(saved.ledger[1]).toEqual(original.ledger[0]);
    expect(saved.requests.slice(1)).toEqual(original.requests);
    expect(() => decodeState('{"version":2,"role":"missing"}')).toThrow();
  });
  it("0과 미기재를 구분하고 배양 증가를 허용하며 음수·비정상 수량을 거부한다", () => {
    expect(() => validateLedger(record)).not.toThrow();
    expect(() => validateLedger({ ...record, used: null })).not.toThrow();
    for (const value of [-1, NaN, Infinity])
      expect(() => validateLedger({ ...record, stored: value })).toThrow();
    expect(() =>
      validateLedger({ ...record, received: null, used: null, stored: null }),
    ).toThrow();
  });
  it("CSV에 단위·비고·기존 수량을 별도 보존하고 수식 시작 문자를 중화한다", () => {
    const csv = ledgerCsv([
      { ...record, notes: ' =HYPERLINK("x")' },
      ...createSeed().ledger,
    ]);
    expect(csv).toContain('"입고량","사용량","보관량","단위","비고"');
    expect(csv).toContain('"1","0","10","vial"');
    expect(csv).toContain("' =HYPERLINK");
    expect(csv).toContain('"기존 단순 기록"');
    expect(csv).toContain('"기존 단일 수량"');
  });
});
