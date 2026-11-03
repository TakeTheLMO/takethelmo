import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionLayout } from "@/components/layout/SectionLayout";
import { ButtonLink } from "@/components/ui/Button";
import { LoginRequired } from "@/components/ui/LoginRequired";
import { findNavContext } from "@/config/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { getPublishedNotice } from "@/features/notices/queries";
import { PinnedBadge } from "@/features/notices/components/NoticeList";

const LIST = "/community/notices";
export const metadata: Metadata = { title: "공지사항" };

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = findNavContext(LIST)!;
  const user = await getSessionUser();

  if (!user) {
    return (
      <SectionLayout group={ctx.group} currentHref={LIST} title={ctx.item!.label}>
        <LoginRequired next={`${LIST}/${encodeURIComponent(id)}`} message="공지사항은 로그인한 기관 구성원만 볼 수 있습니다." />
      </SectionLayout>
    );
  }

  // 다른 기관·임시저장·게시중단 공지는 RLS/조건에 걸려 null → 404
  const notice = await getPublishedNotice(id);
  if (!notice) notFound();

  const published = formatDate(notice.published_at!);
  const updated = formatDate(notice.updated_at);

  return (
    <SectionLayout group={ctx.group} currentHref={LIST} title={ctx.item!.label}>
      <article className="rounded-lg border border-gray-200 bg-white">
        <header className="border-b border-gray-200 px-5 py-5 sm:px-6">
          <h2 className="flex items-start gap-2 text-xl font-semibold text-gray-900">
            {notice.is_pinned && <span className="mt-1"><PinnedBadge /></span>}
            <span>{notice.title}</span>
          </h2>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <div className="flex gap-1"><dt>게시일</dt><dd>{published}</dd></div>
            {updated !== published && <div className="flex gap-1"><dt>수정일</dt><dd>{updated}</dd></div>}
          </dl>
        </header>
        {/* plain text: HTML 로 해석하지 않는다 */}
        <div className="whitespace-pre-wrap break-words px-5 py-6 text-[15px] leading-7 text-gray-800 sm:px-6">{notice.body}</div>
      </article>
      <div className="mt-6 flex justify-center">
        <ButtonLink href={LIST} variant="outline">목록으로</ButtonLink>
      </div>
    </SectionLayout>
  );
}
