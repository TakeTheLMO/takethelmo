import { describe, expect, it } from "vitest";
import { findNavContext, navigation } from "./navigation";

// 메뉴 설정 실수(중복 경로, 다른 그룹 경로 사용, 예약 경로 충돌)를 CI에서 잡는다.
const RESERVED = ["/admin", "/auth", "/login", "/forgot-password", "/reset-password", "/forbidden", "/privacy", "/terms"];

describe("navigation 설정", () => {
  const all = navigation.flatMap((g) => g.items.map((i) => i.href));

  it("하위 메뉴 경로는 중복되지 않는다", () => {
    expect(new Set(all).size).toBe(all.length);
  });

  it("하위 메뉴 경로는 그룹 경로로 시작한다", () => {
    for (const g of navigation) {
      for (const i of g.items) expect(i.href === g.href || i.href.startsWith(`${g.href}/`)).toBe(true);
    }
  });

  it("예약된 경로와 겹치지 않는다", () => {
    for (const href of [...all, ...navigation.map((g) => g.href)]) {
      expect(RESERVED.some((r) => href === r || href.startsWith(`${r}/`))).toBe(false);
    }
  });

  it("그룹 경로와 하위 경로 모두 찾을 수 있다", () => {
    expect(findNavContext("/library")?.item).toBeNull();
    expect(findNavContext("/library")?.group.label).toBe("자료실");
    expect(findNavContext("/safety")?.item?.label).toBe("안전관리 안내");
    expect(findNavContext("/nope")).toBeNull();
  });
});
