import { navigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import type { Category, ContentRecord } from "../user-management/records";
export const managedMenus = [
  { href: "/portal", label: "메인 포털", group: "홈", description: "연구실의 안전을 관리하고 연구자의 안전한 연구활동을 지원하는 통합 안전관리 플랫폼" },
  ...navigation.filter(group => !group.adminOnly).flatMap(group => group.items.map(item => ({ ...item, group: group.label }))),
  { href: "/privacy", label: "개인정보처리방침", group: "사이트 안내", description: "" },
  { href: "/terms", label: "이용약관", group: "사이트 안내", description: "" },
];
export type MenuPage = { title: string; description: string; body: string };
export type SharedFile = { id: string; name: string; size: number };
export const postTypes = ["안내", "공지", "매뉴얼", "서식", "교육 자료", "법령·규정", "MSDS", "동영상", "FAQ"] as const;
export type SharedPost = { id: string; title: string; body: string; type: string; status: "draft" | "published" | "archived"; sourceUrl: string; files: SharedFile[] };
export type MenuDocument = { path: string; revision: number; page: MenuPage; posts: SharedPost[]; updatedAt?: string };
export type ContentHistory = { id: string; at: string; actor: string; reason: string; beforeValue: string; afterValue: string };
export function defaultDocument(path: string): MenuDocument {
  const menu = managedMenus.find(menu => menu.href === path);
  if (!menu) throw new Error("관리할 수 없는 메뉴입니다.");
  return { path, revision: 0, page: { title: path === "/portal" ? `안전한 연구환경, ${siteConfig.name}` : menu.label, description: menu.description || "", body: "" }, posts: [] };
}
export function menuCategories(path: string): Category[] {
  if (path === "/portal" || path === "/mypage" || path === "/support/search" || path === "/mypage/notifications") return ["requests", "lab", "members", "courses", "enrollments", "inspections", "actions", "incidents", "ledger", "assessment"];
  if (path.includes("inquiry") || path.includes("requests") || path.includes("history") || path === "/community/qna") return ["requests"];
  if (path.includes("assessment") || path === "/lmo") return ["assessment", "requests"];
  if (path.includes("ledger")) return ["ledger"];
  if (path.includes("members") || path.includes("managers")) return ["members", "lab"];
  if (path.includes("safety-status")) return ["lab", "inspections", "actions", "enrollments", "incidents"];
  if (path.startsWith("/labs") || ["/lmo/facilities", "/lmo/grades"].includes(path)) return ["lab", "members", "requests"];
  if (path.startsWith("/training") || path === "/lmo/training") return ["courses", "enrollments"];
  if (path === "/safety/incidents") return ["incidents"];
  if (path === "/safety/corrective-actions") return ["actions"];
  if (["/safety", "/safety/inspections", "/safety/checklists", "/safety/results"].includes(path)) return ["inspections", "actions"];
  if (path === "/library/manuals") return ["enrollments", "actions", "incidents"];
  if (path === "/library/training") return ["courses", "enrollments"];
  if (path === "/library/incident-response") return ["incidents", "actions"];
  if (path === "/lmo/documents") return ["requests", "ledger"];
  return [];
}
export function belongsToMenu(path: string, record: ContentRecord) {
  if (!menuCategories(path).includes(record.category)) return false;
  if (path === "/lmo/inquiry") return record.data.kind === "IBC 사전 문의";
  if (path === "/lmo/history") return record.data.kind === "LMO 시설 변경";
  return true;
}
