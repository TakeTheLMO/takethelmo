import type { RecordStatus } from "@/types";

export const NOTICE_TITLE_MAX = 200;
export const NOTICE_BODY_MAX = 20_000;
export const NOTICE_PAGE_SIZE = 15;
export const ADMIN_NOTICE_PAGE_SIZE = 20;

export type Notice = {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  published_at: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
};
export type NoticeListItem = Pick<Notice, "id" | "title" | "is_pinned" | "published_at">;
export type AdminNoticeListItem = Pick<Notice, "id" | "title" | "is_pinned" | "published_at" | "status" | "updated_at">;

export type NoticeInput = { title: string; body: string; isPinned: boolean; publish: boolean };
export type NoticeField = "title" | "body" | "organizationId";
export type FieldErrors = Partial<Record<NoticeField, string>>;

export type NoticeActionResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

// 서버 액션에 들어온 값은 신뢰하지 않는다: 타입부터 다시 확인한다.
export function parseNoticeInput(raw: unknown): { ok: true; value: NoticeInput } | { ok: false; fieldErrors: FieldErrors } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  const body = typeof r.body === "string" ? r.body.replace(/\r\n/g, "\n").trim() : "";
  const fieldErrors: FieldErrors = {};
  if (!title) fieldErrors.title = "제목을 입력해 주세요.";
  else if (title.length > NOTICE_TITLE_MAX) fieldErrors.title = `제목은 ${NOTICE_TITLE_MAX}자 이내로 입력해 주세요.`;
  if (!body) fieldErrors.body = "본문을 입력해 주세요.";
  else if (body.length > NOTICE_BODY_MAX) fieldErrors.body = `본문은 ${NOTICE_BODY_MAX.toLocaleString("ko-KR")}자 이내로 입력해 주세요.`;
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, value: { title, body, isPinned: r.isPinned === true, publish: r.publish === true } };
}

export type NoticeState = "published" | "scheduled" | "draft" | "inactive";
export const NOTICE_STATE_LABELS: Record<NoticeState, string> = {
  published: "게시중",
  scheduled: "게시 예정",
  draft: "임시저장",
  inactive: "게시중단",
};

export function noticeState(n: Pick<Notice, "status" | "published_at">, now: Date = new Date()): NoticeState {
  if (n.status !== "active") return "inactive";
  if (!n.published_at) return "draft";
  return new Date(n.published_at) > now ? "scheduled" : "published";
}

/** 수정 시 게시일: 이미 게시된 글은 원래 게시일 유지, 임시저장으로 돌리면 null */
export function nextPublishedAt(current: string | null, publish: boolean, now: Date = new Date()): string | null {
  if (!publish) return null;
  return current ?? now.toISOString();
}
