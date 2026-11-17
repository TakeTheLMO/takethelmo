export const workspacePaths = {
  overview: "/mypage", training: "/training/courses", requests: "/mypage/requests",
  notifications: "/mypage/notifications", assistant: "/support/assistant", search: "/support/search",
  guides: "/support/guides", assessment: "/lmo/assessment", library: "/library/manuals",
  inspections: "/safety/inspections", incidents: "/safety/incidents", labs: "/labs",
  emergency: "/safety/emergency", users: "/management/users", menus: "/management/menus",
} as const;
export type WorkspaceSection = keyof typeof workspacePaths;
export function portalHref(href: string): string {
  const url = new URL(href, "http://workspace.local");
  if (url.origin !== "http://workspace.local") return href;
  if (url.pathname === "/demo" || url.pathname.startsWith("/demo/")) {
    const section = url.pathname.slice(6) || "overview";
    return (workspacePaths[section as WorkspaceSection] || workspacePaths.overview) + url.search + url.hash;
  }
  if (url.pathname === "/prototype-login") return "/login" + url.search;
  return href;
}
export const workspaceAliases: Record<string, WorkspaceSection> = {
  "/safety": "guides", "/safety/checklists": "inspections", "/safety/results": "inspections",
  "/safety/corrective-actions": "inspections", "/safety/regulations": "library",
  "/labs/details": "labs", "/labs/members": "labs", "/labs/managers": "labs", "/labs/facilities": "labs", "/labs/safety-status": "labs",
  "/training": "training", "/training/targets": "training", "/training/records": "training", "/training/certificates": "training",
  "/lmo": "assessment", "/lmo/facilities": "labs", "/lmo/grades": "labs", "/lmo/managers": "labs", "/lmo/history": "requests",
  "/lmo/ledger": "labs", "/lmo/documents": "library", "/lmo/training": "training", "/lmo/inquiry": "requests",
  "/library/training": "library", "/library/incident-response": "library", "/library/laws": "library", "/library/forms": "library",
  "/library/msds": "library", "/library/videos": "library",
  "/community/qna": "requests", "/community/faq": "guides",
};
export function workspaceSection(path: string): WorkspaceSection | undefined {
  return workspaceAliases[path] || (Object.entries(workspacePaths).find(([, value]) => value === path)?.[0] as WorkspaceSection | undefined);
}
export function isWorkspacePath(path: string) { return !!workspaceSection(path); }
