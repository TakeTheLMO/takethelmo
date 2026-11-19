import { NextRequest, NextResponse } from "next/server";
import { accountAccess, accountError } from "@/features/user-management/server";
import { DataError } from "@/features/user-management/database";
import { portalContent } from "@/features/portal-content/server";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const { user } = await accountAccess(request), file = await (await portalContent()).file(user.id, request.nextUrl.searchParams.get("id") || "");
    return new Response(new Uint8Array(file.body as Uint8Array), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(String(file.name))}`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return accountError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const { user, store } = await accountAccess(request, true); await store.admin(user.id);
    if (Number(request.headers.get("content-length")) > 5 * 1024 * 1024 + 10000) throw new DataError("첨부가 너무 큽니다.", 413);
    const form = await request.formData(), file = form.get("file");
    if (!(file instanceof File)) throw new DataError("첨부파일을 선택해 주세요.");
    return NextResponse.json(await (await portalContent()).putFile(user.id, file.name, file.type, new Uint8Array(await file.arrayBuffer())));
  } catch (error) { return accountError(error); }
}
