import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { NOTICE_PAGE_SIZE, type NoticeListItem } from "../schema";

export function PinnedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded bg-brand-700 px-1.5 py-0.5 text-xs font-semibold text-white">
      공지
    </span>
  );
}

// 번호는 전체 건수 기준 역순. 고정 공지는 번호 대신 "공지" 배지.
export function NoticeList({
  rows,
  total,
  page,
  searched,
}: {
  rows: NoticeListItem[];
  total: number;
  page: number;
  searched: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState message={searched ? "검색 결과가 없습니다. 다른 검색어로 다시 찾아 주세요." : "등록된 공지사항이 없습니다."} />;
  }
  const offset = (page - 1) * NOTICE_PAGE_SIZE;
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">공지사항 목록, 총 {total}건</caption>
        <thead className="hidden bg-gray-50 text-gray-600 sm:table-header-group">
          <tr>
            <th scope="col" className="w-20 px-4 py-3 text-center font-medium">번호</th>
            <th scope="col" className="px-4 py-3 font-medium">제목</th>
            <th scope="col" className="w-32 px-4 py-3 text-center font-medium">게시일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((n, i) => (
            <tr key={n.id} className={n.is_pinned ? "bg-brand-50/50" : undefined}>
              <td className="hidden px-4 py-3 text-center text-gray-500 sm:table-cell">
                {n.is_pinned ? <PinnedBadge /> : total - offset - i}
              </td>
              <td className="px-4 py-3">
                <Link href={`/community/notices/${n.id}`} className="flex items-center gap-2 font-medium text-gray-900 hover:text-brand-700">
                  {n.is_pinned && <span className="sm:hidden"><PinnedBadge /></span>}
                  <span className="line-clamp-2">{n.title}</span>
                </Link>
                <span className="mt-1 block text-xs text-gray-500 sm:hidden">{n.published_at && formatDate(n.published_at)}</span>
              </td>
              <td className="hidden px-4 py-3 text-center text-gray-500 sm:table-cell">
                {n.published_at && formatDate(n.published_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
