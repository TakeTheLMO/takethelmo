import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { localAuth } from "./database";
import { safeNextPath } from "@/lib/safe-redirect";
export const LOCAL_SESSION_COOKIE = "takethelmo-local-session";
export async function getLocalUser() {
  try { return localAuth().user((await cookies()).get(LOCAL_SESSION_COOKIE)?.value); }
  catch { return null; }
}
export async function requireLocalUser(path = "/mypage") {
  const user = await getLocalUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNextPath(path, "/mypage"))}`);
  return user;
}
