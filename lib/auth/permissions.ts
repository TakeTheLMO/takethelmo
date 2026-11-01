import { ADMIN_AREA_ROLES, PRIVILEGED_ROLES, type Role } from "@/config/roles";

// DB 트리거(guard_profile_change)와 같은 규칙. UI에서 미리 막거나 버튼을 숨기는 용도이며,
// 실제 강제는 항상 서버와 DB(RLS/트리거)가 한다. 규칙을 바꾸면 양쪽을 함께 수정하고 테스트할 것.
export type Decision = { ok: true } | { ok: false; reason: string };

export const canAccessAdminArea = (role: Role | null | undefined) =>
  !!role && ADMIN_AREA_ROLES.includes(role);

export const isPrivileged = (role: Role | null | undefined) =>
  !!role && PRIVILEGED_ROLES.includes(role);

export function canChangeAccount(args: {
  actorId: string;
  actorRole: Role;
  targetId: string;
  targetCurrentRole: Role;
  newRole?: Role; // 역할 변경이 아니라 비활성화 등이면 생략
}): Decision {
  const { actorId, actorRole, targetId, targetCurrentRole, newRole } = args;
  if (!isPrivileged(actorRole)) return { ok: false, reason: "관리 권한이 없습니다." };
  if (actorId === targetId) return { ok: false, reason: "본인의 권한과 상태는 변경할 수 없습니다." };
  const touchesPrivileged = isPrivileged(targetCurrentRole) || (newRole !== undefined && isPrivileged(newRole));
  if (touchesPrivileged && actorRole !== "super_admin") {
    return { ok: false, reason: "super_admin만 관리자 권한을 지정·해제할 수 있습니다." };
  }
  return { ok: true };
}

// 범위 역할(lab_manager/lmo_manager)은 안전관리자가 자기 기관 범위에서 부여할 수 있다.
export function canGrantScopedRole(actorRole: Role, role: Role): Decision {
  if (actorRole === "super_admin") return { ok: true };
  if (actorRole === "safety_admin" && (role === "lab_manager" || role === "lmo_manager")) return { ok: true };
  return { ok: false, reason: "이 역할을 부여할 권한이 없습니다." };
}
