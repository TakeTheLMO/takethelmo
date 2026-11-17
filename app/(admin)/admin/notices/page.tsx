import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PRIVILEGED_ROLES } from "@/config/roles";
import { ButtonLink } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { parsePage } from "@/lib/format";
import { listNoticesForAdmin } from "@/features/notices/queries";
import { AdminNoticeTable } from "@/features/notices/components/AdminNoticeTable";

export const metadata: Metadata = { title: "공지사항 관리" };

export default async function AdminNoticesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireRole(PRIVILEGED_ROLES, "/admin/notices");
  const page = parsePage((await searchParams).page);
  // 조회 범위는 RLS: super_admin 전체, safety_admin 담당 기관 (임시저장·게시중단 포함)
  const result = await listNoticesForAdmin({ page });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">공지사항 관리</h1>
          <p className="mt-1 text-sm text-gray-600">총 {result.total.toLocaleString("ko-KR")}건. 공지는 삭제하지 않고 게시중단합니다.</p>
        </div>
        <ButtonLink href="/admin/notices/new">
          <Plus className="h-4 w-4" aria-hidden />
          새 공지
        </ButtonLink>
      </div>
      <AdminNoticeTable rows={result.rows} />
      <Pagination basePath="/admin/notices" page={page} totalPages={result.totalPages} />
    </div>
  );
}
