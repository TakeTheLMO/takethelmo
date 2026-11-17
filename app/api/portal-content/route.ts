import { NextRequest, NextResponse } from "next/server";
import { accountAccess, accountError } from "@/features/user-management/server";
import { DataError } from "@/features/user-management/database";
import { portalContent } from "@/features/portal-content/server";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try { const { user } = await accountAccess(request); return NextResponse.json(portalContent().detail(user.id, request.nextUrl.searchParams.get("path") || "/portal"), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return accountError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const { user, store } = await accountAccess(request, true); store.admin(user.id);
    if (Number(request.headers.get("content-length")) > 2 * 1024 * 1024) throw new DataError("내용이 너무 큽니다.", 413);
    const raw = await request.text(); if (raw.length > 2 * 1024 * 1024) throw new DataError("내용이 너무 큽니다.", 413);
    return NextResponse.json(portalContent().save(user.id, JSON.parse(raw)));
  } catch (error) { return accountError(error); }
}
