import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { PRIVILEGED_ROLES } from "@/config/roles";
import { listWritableOrganizations } from "@/features/notices/queries";
import { NoticeForm } from "@/features/notices/components/NoticeForm";

export const metadata: Metadata = { title: "새 공지 작성" };

export default async function NewNoticePage() {
  const user = await requireRole(PRIVILEGED_ROLES, "/admin/notices/new");
  // super_admin 만 기관을 고른다. safety_admin 은 서버에서 소속 기관으로 고정.
  const organizations = user.profile.role === "super_admin" ? await listWritableOrganizations() : undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">새 공지 작성</h1>
      <NoticeForm organizations={organizations} defaultOrganizationId={user.profile.organization_id} />
    </div>
  );
}
