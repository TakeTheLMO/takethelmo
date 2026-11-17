import { redirect } from "next/navigation";
import { requireLocalUser } from "../local-auth/session";
import { SectionLayout } from "@/components/layout/SectionLayout";
import { findNavContext } from "@/config/navigation";
import { workspaceSection } from "@/config/workspace";
import { Overview } from "./Overview";
import { Training } from "../demo/Training";
import { Requests } from "../demo/Requests";
import { Labs } from "../demo/Labs";
import { Inspections } from "../demo/Inspections";
import { Incidents } from "../demo/Incidents";
import { Notifications } from "../demo/Notifications";
import { SearchPage, Library, Assistant, Guides, Assessment, Emergency } from "../demo/Discovery";
import { Users } from "../user-management/Users";
import { PersonalFiles } from "./PortalHighlights";
import { Empty, Panel } from "@/components/ui/DemoUI";
import { MenuManager } from "../portal-content/MenuManager";
import { portalContent } from "../portal-content/server";
import { PublishedContent } from "../portal-content/PublishedContent";
export async function WorkPage({ path, query = {} }: { path: string; query?: Record<string, string | string[] | undefined> }) {
  const user = await requireLocalUser(path), section = workspaceSection(path), context = findNavContext(path);
  if ((section === "users" || section === "menus") && !user.canSwitchRole) redirect("/mypage");
  const document = path.startsWith("/management") ? null : portalContent().published(path);
  const value = (key: string) => typeof query[key] === "string" ? query[key] as string : undefined;
  let content;
  switch (section) {
    case "overview": content = <Overview />; break;
    case "training": content = <Training />; break;
    case "requests": content = <Requests initialKind={path === "/lmo/inquiry" ? "ibc" : value("kind")} />; break;
    case "labs": content = <Labs initialTab={path.includes("ledger") ? "관리대장" : path.includes("members") || path.includes("managers") ? "구성원" : path.includes("safety-status") ? "안전 현황" : "시설 정보"} />; break;
    case "inspections": content = <Inspections />; break;
    case "incidents": content = <Incidents />; break;
    case "notifications": content = <Notifications />; break;
    case "search": content = <SearchPage initialQuery={value("q")} sharedPosts={portalContent().search()} />; break;
    case "library": content = path === "/library/msds" || path === "/library/videos" ? document?.posts.length ? null : <Panel><Empty>{path.endsWith("msds") ? "등록된 MSDS 자료가 없습니다. 취급 물질의 최신 자료를 담당자에게 확인해 주세요." : "등록된 안전 관련 동영상이 없습니다."}</Empty></Panel> : <div className="space-y-6"><PersonalFiles /><Library selectedDoc={value("doc")} /></div>; break;
    case "assistant": content = <Assistant />; break;
    case "guides": content = <Guides />; break;
    case "assessment": content = <Assessment />; break;
    case "emergency": content = <Emergency />; break;
    case "users": content = <Users initialUser={value("user")} initialCategory={value("category")} initialRecord={value("record")} />; break;
    case "menus": content = <MenuManager initialPath={value("path")} />; break;
  }
  if (!context) return content;
  return <SectionLayout group={context.group} currentHref={path} title={document?.page.title || context.item?.label || context.group.label} description={document?.page.description ?? context.item?.description}><div className="space-y-6">{document && <PublishedContent document={document} admin={user.canSwitchRole} />}{content}</div></SectionLayout>;
}
