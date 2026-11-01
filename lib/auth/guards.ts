import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";
import { safeNextPath } from "@/lib/safe-redirect";
import type { Role } from "@/config/roles";

// 모든 보호 페이지/Server Action/Route Handler는 미들웨어와 별개로 여기서 다시 검사한다.
// (미들웨어 우회 취약점이 반복적으로 보고되고, 레이아웃은 클라이언트 이동 시 재실행되지 않기 때문)
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  return user;
}

export async function requireRole(roles: readonly Role[], nextPath: string): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (!roles.includes(user.profile.role)) redirect("/forbidden");
  // TODO(MFA): 관리자 역할은 여기서 aal2(TOTP) 여부를 추가로 요구할 것
  return user;
}
