import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { PRIVILEGED_ROLES } from "@/config/roles";
import { createClient } from "@/lib/supabase/server";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import type { AuditLogRow } from "@/types";

export const metadata: Metadata = { title: "감사로그" };

export default async function AuditLogsPage() {
  await requireRole(PRIVILEGED_ROLES, "/admin/audit-logs");
  // 조회 범위는 DB(RLS)가 결정한다: super_admin 전체, safety_admin은 담당 기관만
  const { data } = await (await createClient())
    .from("audit_logs")
    .select("id,created_at,action,actor_id,actor_role,target_table,target_id")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">감사로그</h1>
      <p className="text-sm text-gray-600">최근 100건. 감사로그는 수정·삭제할 수 없습니다.</p>
      <AuditLogTable rows={(data ?? []) as AuditLogRow[]} />
    </div>
  );
}
