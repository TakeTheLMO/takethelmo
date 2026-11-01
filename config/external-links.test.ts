import { describe, expect, it } from "vitest";
import { externalLinks, externalLinksFor } from "./external-links";

describe("externalLinksFor", () => {
  it("가장 길게 일치하는 경로를 쓴다", () => {
    expect(externalLinksFor("/lmo/training")).toEqual([externalLinks.lmo, externalLinks.edu]);
    expect(externalLinksFor("/lmo/facilities")).toEqual([externalLinks.lmo]);
  });
  it("자료실·교육은 각각 연구실안전정보망·안전교육", () => {
    expect(externalLinksFor("/library/laws")).toEqual([externalLinks.labs]);
    expect(externalLinksFor("/training")).toEqual([externalLinks.edu]);
  });
  it("관련 없는 경로는 빈 배열, 접두어만 비슷한 경로는 일치하지 않는다", () => {
    expect(externalLinksFor("/labs")).toEqual([]);
    expect(externalLinksFor("/lmox")).toEqual([]);
  });
  it("모든 링크는 https", () => {
    for (const l of Object.values(externalLinks)) expect(l.href.startsWith("https://")).toBe(true);
  });
});
