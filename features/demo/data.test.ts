import { describe, expect, it } from "vitest";
import { documents, libraryCategoryFor, searchDocuments } from "./data";

describe("자료실 분류", () => {
  it("하위 메뉴 경로마다 해당 분류를 먼저 보여준다", () => {
    expect(libraryCategoryFor("/library/forms")).toBe("서식");
    expect(libraryCategoryFor("/library/incident-response")).toBe("사고 대응");
    expect(libraryCategoryFor("/lmo/documents")).toBe("LMO");
    expect(libraryCategoryFor("/library/manuals")).toBe("전체");
  });
  it("매핑한 분류는 모두 실제 문서가 있다", () => {
    for (const path of ["/library/forms", "/library/incident-response", "/library/training", "/library/laws", "/lmo/documents"])
      expect(searchDocuments("", libraryCategoryFor(path)).length).toBeGreaterThan(0);
  });
  it("제목을 바꾼 문서도 예전 검색어로 찾을 수 있다", () => {
    expect(searchDocuments("체크리스트").map(d => d.id)).toContain("sop-start");
    expect(searchDocuments("비상연락망").map(d => d.id)).toContain("guide-emergency");
    expect(documents.find(d => d.id === "guide-emergency")?.body).not.toMatch(/\d{2,4}-\d{3,4}-\d{4}/);
  });
});
