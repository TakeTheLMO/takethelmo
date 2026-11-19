import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getLocalUser } from "../local-auth/session";
import { localAuth } from "../local-auth/database";
import { AccountDataStore, DataError } from "./database";
export async function accountAccess(request: NextRequest, write = false) {
  const user = await getLocalUser();
  if (!user) throw new DataError("로그인이 필요합니다.", 401);
  if (write && request.headers.get("origin") !== `${request.nextUrl.protocol}//${request.headers.get("host")}`) throw new DataError("요청 출처를 확인할 수 없습니다.", 403);
  return { user, store: new AccountDataStore(localAuth().db) };
}
export function accountError(error: unknown) {
  return NextResponse.json({ message: error instanceof Error ? error.message : "저장하지 못했습니다." }, { status: error instanceof DataError ? error.status : 400, headers: { "Cache-Control": "no-store" } });
}
