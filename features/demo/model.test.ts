import { describe, expect, it } from "vitest";
import { answerQuestion, createSeed, searchDocuments } from "./data";
import { canReview, transitionAction, transitionRequest } from "./model";
import { validateFile } from "./files";
describe("가상 신청 검토", () => {
  it("검토 시작 없이 승인하거나 본인이 검토할 수 없다", () => {
    const request = createSeed().requests[0];
    expect(() =>
      transitionRequest(request, "safety_admin", "승인", "확인"),
    ).toThrow();
    expect(() =>
      transitionRequest(request, "researcher", "검토 중", "확인"),
    ).toThrow();
    expect(canReview("lmo_manager", request)).toBe(false);
  });
  it("보완 요청 → 작성자 재제출 → 재검토 → 승인 이력을 보존한다", () => {
    let request = createSeed().requests[0];
    request = transitionRequest(
      request,
      "safety_admin",
      "검토 중",
      "확인 시작",
    );
    request = transitionRequest(
      request,
      "safety_admin",
      "보완 요청",
      "교육 정보를 추가해 주세요",
    );
    expect(() =>
      transitionRequest(request, "lab_manager", "제출", "대신 제출", "수정"),
    ).toThrow();
    expect(() =>
      transitionRequest(request, "researcher", "제출", "보완", "  "),
    ).toThrow();
    request = transitionRequest(
      request,
      "researcher",
      "제출",
      "교육 정보 추가",
      "수정된 내용",
    );
    expect(request.body).toBe("수정된 내용");
    request = transitionRequest(request, "lab_manager", "검토 중", "재확인");
    request = transitionRequest(request, "lab_manager", "승인", "확인 완료");
    expect(request.history.map((h) => h.event)).toEqual([
      "제출",
      "검토 중",
      "보완 요청",
      "보완 후 재제출",
      "검토 중",
      "승인",
    ]);
    expect(() =>
      transitionRequest(request, "safety_admin", "반려", "다시 판단"),
    ).toThrow();
  });
  it("종결 의견은 공백일 수 없다", () => {
    const item = transitionRequest(
      createSeed().requests[0],
      "safety_admin",
      "검토 중",
      "시작",
    );
    expect(() =>
      transitionRequest(item, "safety_admin", "반려", "  "),
    ).toThrow();
  });
});
describe("개선조치", () => {
  it("증빙을 제출한 뒤 다른 검토자가 종결한다", () => {
    const item = createSeed().actions[0];
    expect(() =>
      transitionAction(item, "researcher", "검토 대기", "정리"),
    ).toThrow();
    const pending = transitionAction(item, "researcher", "검토 대기", "정리", {
      id: "file",
      name: "사진.png",
      type: "image/png",
      size: 1,
    });
    expect(() =>
      transitionAction(pending, "researcher", "종결", "확인"),
    ).toThrow();
    const returned = transitionAction(
      pending,
      "safety_admin",
      "조치 중",
      "추가 조치 필요",
    );
    const resubmitted = transitionAction(
      returned,
      "researcher",
      "검토 대기",
      "추가 완료",
    );
    expect(
      transitionAction(resubmitted, "lab_manager", "종결", "증빙 확인").history,
    ).toHaveLength(5);
  });
});
describe("자료와 파일", () => {
  it("검색은 제목뿐 아니라 내용과 유형을 반영한다", () => {
    expect(searchDocuments("기관 승인", "SOP").map((d) => d.id)).toContain(
      "sop-start",
    );
    expect(searchDocuments("존재하지않는검색어")).toEqual([]);
    expect(searchDocuments("교육", "서식")).toHaveLength(0);
  });
  it("도우미는 근거 없는 답을 만들어내지 않는다", () => {
    expect(answerQuestion("교육 이수증").sources).toContain("policy-education");
    expect(answerQuestion("일기예보").sources).toHaveLength(0);
    expect(answerQuestion("LMO").text).toContain("판정하지 않습니다");
  });
  it("비어 있는 파일과 허용하지 않는 형식 및 5MB 초과 파일을 거부한다", () => {
    expect(() =>
      validateFile(new File(["ok"], "test.png", { type: "image/png" })),
    ).not.toThrow();
    expect(() =>
      validateFile(new File([], "test.png", { type: "image/png" })),
    ).toThrow();
    expect(() =>
      validateFile(new File(["x"], "test.html", { type: "text/html" })),
    ).toThrow();
    expect(() =>
      validateFile(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "test.pdf", {
          type: "application/pdf",
        }),
      ),
    ).toThrow();
  });
});
