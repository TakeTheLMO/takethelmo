import { describe, expect, it } from "vitest";
import { NOTICE_BODY_MAX, NOTICE_TITLE_MAX, nextPublishedAt, noticeState, parseNoticeInput } from "./schema";

describe("parseNoticeInput", () => {
  it("제목·본문 앞뒤 공백을 지우고 통과", () => {
    const r = parseNoticeInput({ title: "  안내 ", body: " 본문\r\n둘째 줄 ", isPinned: true, publish: true });
    expect(r).toEqual({ ok: true, value: { title: "안내", body: "본문\n둘째 줄", isPinned: true, publish: true } });
  });

  it("빈 제목·본문은 필드별 오류", () => {
    const r = parseNoticeInput({ title: "   ", body: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.title).toBeDefined();
      expect(r.fieldErrors.body).toBeDefined();
    }
  });

  it("길이 제한", () => {
    const r = parseNoticeInput({ title: "가".repeat(NOTICE_TITLE_MAX + 1), body: "a".repeat(NOTICE_BODY_MAX + 1) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["body", "title"]);
    expect(parseNoticeInput({ title: "가".repeat(NOTICE_TITLE_MAX), body: "a" }).ok).toBe(true);
  });

  it("문자열이 아닌 값·불리언이 아닌 플래그는 무시", () => {
    const r = parseNoticeInput({ title: "t", body: "b", isPinned: "true", publish: 1 });
    expect(r).toEqual({ ok: true, value: { title: "t", body: "b", isPinned: false, publish: false } });
    expect(parseNoticeInput(null).ok).toBe(false);
    expect(parseNoticeInput({ title: 1, body: {} }).ok).toBe(false);
  });
});

describe("noticeState", () => {
  const now = new Date("2026-11-03T00:00:00Z");
  it("상태 판정", () => {
    expect(noticeState({ status: "inactive", published_at: "2026-11-01T00:00:00Z" }, now)).toBe("inactive");
    expect(noticeState({ status: "active", published_at: null }, now)).toBe("draft");
    expect(noticeState({ status: "active", published_at: "2026-11-04T00:00:00Z" }, now)).toBe("scheduled");
    expect(noticeState({ status: "active", published_at: "2026-11-02T00:00:00Z" }, now)).toBe("published");
  });
});

describe("nextPublishedAt", () => {
  const now = new Date("2026-11-03T00:00:00Z");
  it("게시된 글은 원래 게시일 유지", () => {
    expect(nextPublishedAt("2026-10-01T00:00:00Z", true, now)).toBe("2026-10-01T00:00:00Z");
  });
  it("임시저장 → 게시는 지금", () => {
    expect(nextPublishedAt(null, true, now)).toBe(now.toISOString());
  });
  it("임시저장으로 돌리면 null", () => {
    expect(nextPublishedAt("2026-10-01T00:00:00Z", false, now)).toBeNull();
  });
});
