import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guards";
import { getSiteUrl } from "@/lib/site-url";
import { logAuditEvent } from "@/lib/audit";
import { PRIVILEGED_ROLES } from "@/config/roles";

// 계정 초대. 역할은 항상 researcher로 시작하고, 상위 역할은 별도 권한 절차(DB 트리거 검증)로만 부여한다.
// 관리자 UI(5단계)에서 호출한다. 호출 전에 반드시 이 함수 안의 권한 검사를 통과해야 한다.
export async function inviteUser(input: { email: string; organizationId: string }) {
  const actor = await requireRole(PRIVILEGED_ROLES, "/admin/users");
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false as const, message: "이메일 형식이 올바르지 않습니다." };
  // safety_admin은 자기 기관에만 초대 가능 (전역 관리자/ super_admin은 제한 없음)
  if (actor.profile.role === "safety_admin" && actor.profile.organization_id !== input.organizationId) {
    return { ok: false as const, message: "다른 기관에는 초대할 수 없습니다." };
  }
  const admin = createAdminClient();
  const redirectTo = `${await getSiteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password?mode=invite")}`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error || !data.user) return { ok: false as const, message: "초대 메일을 보내지 못했습니다." };
  const { error: updateError } = await admin
    .from("profiles").update({ organization_id: input.organizationId }).eq("id", data.user.id);
  if (updateError) return { ok: false as const, message: "초대는 발송되었으나 소속 지정에 실패했습니다. 관리자에게 알려 주세요." };
  await logAuditEvent({ actorId: actor.id, action: "user.invited", targetTable: "profiles", targetId: data.user.id });
  return { ok: true as const };
}
