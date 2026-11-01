export const ROLES = ["super_admin", "safety_admin", "lab_manager", "lmo_manager", "researcher"] as const;
export type Role = (typeof ROLES)[number];

// 화면 표시용 한국어 이름. DB enum(public.user_role) 값은 영문 그대로 유지한다.
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "최고관리자",
  safety_admin: "안전관리자",
  lab_manager: "연구실 관리자",
  lmo_manager: "LMO 관리자",
  researcher: "연구활동종사자",
};

// 관리자 화면에 들어올 수 있는 역할 (메뉴별 세부 권한은 config/admin-navigation.ts)
export const ADMIN_AREA_ROLES: readonly Role[] = ["super_admin", "safety_admin", "lab_manager", "lmo_manager"];
// super_admin/safety_admin: 사용자·권한 관리 및 감사로그 열람
export const PRIVILEGED_ROLES: readonly Role[] = ["super_admin", "safety_admin"];

// 로그인이 필요한 경로. 역할 검사는 각 page/route에서 requireRole로 다시 수행한다.
export const PROTECTED_PREFIXES = ["/admin"];
