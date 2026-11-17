export const accountRoles = {
  researcher: "일반 연구원",
  lab_manager: "연구실 안전담당자",
  lmo_manager: "LMO 담당자",
  safety_admin: "기관 안전관리자",
  super_admin: "시스템 관리자",
} as const;
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
