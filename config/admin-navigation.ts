import { ADMIN_AREA_ROLES, PRIVILEGED_ROLES, type Role } from "./roles";

export type AdminNavItem = { label: string; href: string; roles: readonly Role[] };

const OPS: readonly Role[] = ["super_admin", "safety_admin", "lab_manager"];
const LMO: readonly Role[] = ["super_admin", "safety_admin", "lmo_manager"];

// roles에 없는 역할에게는 메뉴가 보이지 않고, URL로 직접 들어와도 서버에서 거부된다.
export const adminNavigation: AdminNavItem[] = [
  { label: "관리자 대시보드", href: "/admin", roles: ADMIN_AREA_ROLES },
  { label: "사용자 관리", href: "/admin/users", roles: PRIVILEGED_ROLES },
  { label: "권한 관리", href: "/admin/roles", roles: PRIVILEGED_ROLES },
  { label: "연구실 관리", href: "/admin/labs", roles: OPS },
  { label: "안전교육 관리", href: "/admin/training", roles: OPS },
  { label: "점검 관리", href: "/admin/inspections", roles: OPS },
  { label: "사고보고 관리", href: "/admin/incidents", roles: OPS },
  { label: "LMO 관리", href: "/admin/lmo", roles: LMO },
  { label: "공지사항 관리", href: "/admin/notices", roles: PRIVILEGED_ROLES },
  { label: "자료실 관리", href: "/admin/library", roles: PRIVILEGED_ROLES },
  { label: "감사로그", href: "/admin/audit-logs", roles: PRIVILEGED_ROLES },
  { label: "시스템 설정", href: "/admin/settings", roles: ["super_admin"] },
];

export const adminMenuFor = (role: Role) => adminNavigation.filter((i) => i.roles.includes(role));
export const findAdminItem = (href: string) => adminNavigation.find((i) => i.href === href) ?? null;
