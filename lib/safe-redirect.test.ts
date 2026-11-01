import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("같은 사이트의 상대 경로만 허용한다", () => {
    expect(safeNextPath("/admin/users?x=1#a")).toBe("/admin/users?x=1#a");
  });
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil", "/a\nb"])(
    "외부/비정상 경로 %j 는 기본값으로 대체한다",
    (v) => expect(safeNextPath(v)).toBe("/"),
  );
  it("값이 없으면 기본값", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined, "/home")).toBe("/home");
  });
});
