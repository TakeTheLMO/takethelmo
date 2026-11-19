import { ROLE_LABELS } from "@/config/roles";

// 표시명은 config/roles.ts 한 곳에서 관리한다 (D-14).
export const accountRoles = ROLE_LABELS;
export type AccountRole = keyof typeof accountRoles;
export const signupRoles = Object.fromEntries(Object.entries(accountRoles).filter(([key]) => key !== "super_admin"));
export function validateSignupRole(role: string): AccountRole {
  const selected = validateRole(role);
  if (selected === "super_admin") throw new Error("시스템 관리자는 회원가입으로 선택할 수 없습니다.");
  return selected;
}
export function validateRole(role: string): AccountRole {
  if (!Object.hasOwn(accountRoles, role)) throw new Error("역할을 선택해 주세요.");
  return role as AccountRole;
}
export function applyAccountRole<T extends { role: AccountRole }>(
  user: { role: AccountRole; canSwitchRole: boolean }, state: T,
): T {
  return user.canSwitchRole ? state : { ...state, role: user.role };
}
