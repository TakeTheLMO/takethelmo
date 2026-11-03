import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import type { AdminNoticeListItem } from "../schema";
import { NoticeStateBadge } from "./NoticeStateBadge";

export function AdminNoticeTable({ rows }: { rows: AdminNoticeListItem[] }) {
  if (rows.length === 0) return <EmptyState message="작성된 공지사항이 없습니다. 새 공지를 작성해 주세요." />;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {["상태", "제목", "게시일", "최종 수정"].map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((n) => (
            <tr key={n.id}>
              <td className="px-4 py-2"><NoticeStateBadge notice={n} /></td>
              <td className="px-4 py-2">
                <Link href={`/admin/notices/${n.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                  {n.is_pinned && <span className="mr-1.5 text-xs font-semibold text-brand-700">[고정]</span>}
                  {n.title}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-gray-600">{n.published_at ? formatDate(n.published_at) : "-"}</td>
              <td className="whitespace-nowrap px-4 py-2 text-gray-600">{formatDate(n.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
