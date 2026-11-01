import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { ADMIN_AREA_ROLES, PRIVILEGED_ROLES } from "@/config/roles";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import type { AuditLogRow } from "@/types";

export const metadata: Metadata = { title: "관리자 대시보드" };

export default async function AdminDashboardPage() {
  const user = await requireRole(ADMIN_AREA_ROLES, "/admin");
  const canSeeAudit = PRIVILEGED_ROLES.includes(user.profile.role);

  let rows: AuditLogRow[] = [];
  if (canSeeAudit) {
    const { data } = await (await createClient())
      .from("audit_logs")
      .select("id,created_at,action,actor_id,actor_role,target_table,target_id")
      .order("created_at", { ascending: false })
      .limit(8);
    rows = (data ?? []) as AuditLogRow[];
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">관리자 대시보드</h1>
      <section>
        <h2 className="mb-3 text-lg font-semibold">처리 대기 업무</h2>
        <EmptyState message="업무 승인 기능이 구현되면 처리 대기 항목이 표시됩니다." />
      </section>
      {canSeeAudit && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">최근 변경 이력</h2>
          <AuditLogTable rows={rows} />
        </section>
      )}
    </div>
  );
}
