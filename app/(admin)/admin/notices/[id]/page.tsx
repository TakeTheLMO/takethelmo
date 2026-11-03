import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { PRIVILEGED_ROLES } from "@/config/roles";
import { formatDate } from "@/lib/format";
import { getNoticeForAdmin } from "@/features/notices/queries";
import { NoticeForm } from "@/features/notices/components/NoticeForm";
import { NoticeStateBadge } from "@/features/notices/components/NoticeStateBadge";
import { NoticeStatusControl } from "@/features/notices/components/NoticeStatusControl";

export const metadata: Metadata = { title: "공지 수정" };

export default async function EditNoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(PRIVILEGED_ROLES, `/admin/notices/${id}`);
  const notice = await getNoticeForAdmin(id); // 다른 기관 공지는 RLS 로 null
  if (!notice) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/notices" className="text-sm text-gray-500 hover:text-brand-700">← 공지사항 관리</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">공지 수정</h1>
          <NoticeStateBadge notice={notice} />
        </div>
        <p className="mt-1 text-sm text-gray-600">
          작성 {formatDate(notice.created_at)} · 최종 수정 {formatDate(notice.updated_at)}. 변경 이력은 감사로그에 기록됩니다.
        </p>
      </div>
      <NoticeForm notice={notice} />
      <NoticeStatusControl id={notice.id} status={notice.status} />
    </div>
  );
}
