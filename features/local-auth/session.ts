import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { localAuth } from "./database";
import { safeNextPath } from "@/lib/safe-redirect";
export const LOCAL_SESSION_COOKIE = "takethelmo-local-session";
export async function getLocalUser() {
  // cookies() 를 먼저 읽어 DB 오류가 나도 페이지가 정적 프리렌더 대상이 되지 않게 한다.
  const token = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
  try { return await (await localAuth()).user(token); }
  catch { return null; }
}
export async function requireLocalUser(path = "/mypage") {
  const user = await getLocalUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNextPath(path, "/mypage"))}`);
  return user;
}
