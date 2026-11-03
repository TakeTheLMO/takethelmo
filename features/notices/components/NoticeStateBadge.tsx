import { cn } from "@/lib/utils";
import { NOTICE_STATE_LABELS, noticeState, type Notice } from "../schema";

const styles = {
  published: "bg-brand-50 text-brand-800",
  scheduled: "bg-gray-100 text-gray-700",
  draft: "bg-gray-100 text-gray-700",
  inactive: "bg-gray-200 text-gray-500 line-through",
} as const;

export function NoticeStateBadge({ notice }: { notice: Pick<Notice, "status" | "published_at"> }) {
  const state = noticeState(notice);
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium", styles[state])}>
      {NOTICE_STATE_LABELS[state]}
    </span>
  );
}
