import { describe, expect, it } from "vitest";
import { escapeLike, formatDate, isUuid, parsePage } from "./format";

describe("formatDate", () => {
  it("한국 시간 기준 YYYY.MM.DD", () => {
    expect(formatDate("2026-11-02T16:00:00Z")).toBe("2026.11.03"); // KST 01:00
    expect(formatDate("2026-01-05T00:00:00+09:00")).toBe("2026.01.05");
  });
});

describe("isUuid", () => {
  it("UUID 형식만 통과", () => {
    expect(isUuid("d0000000-0000-0000-0000-000000000001")).toBe(true);
    expect(isUuid("1")).toBe(false);
    expect(isUuid("../etc")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("parsePage", () => {
  it("잘못된 값은 1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["4", "5"])).toBe(4);
  });
});

describe("escapeLike", () => {
  it("%, _, \\ 를 이스케이프", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });
});
