import { NextRequest, NextResponse } from "next/server";
import { accountAccess, accountError } from "@/features/user-management/server";
import { DataError } from "@/features/user-management/database";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const { user, store } = await accountAccess(request);
    const query = request.nextUrl.searchParams;
    const result = query.get("view") === "users" ? await store.users(user.id, query.get("q") || "")
      : query.get("view") === "records" ? await store.allRecords(user.id)
      : query.get("view") === "files" ? await store.allFiles(user.id)
      : query.get("view") === "activity" ? await store.activity(user.id)
      : query.has("user") ? await store.detail(user.id, query.get("user")!) : await store.snapshot(user.id);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return accountError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const { user, store } = await accountAccess(request, true);
    if (Number(request.headers.get("content-length")) > 2 * 1024 * 1024) throw new DataError("저장 내용이 너무 큽니다.", 413);
    const text = await request.text();
    if (text.length > 2 * 1024 * 1024) throw new DataError("저장 내용이 너무 큽니다.", 413);
    const input = JSON.parse(text);
    if (input.action === "profile") await store.updateUser(user.id, String(input.user), input);
    else if (input.action === "record") await store.updateRecord(user.id, String(input.user), input);
    else if (input.action === "read") await store.readActivity(user.id, Array.isArray(input.ids) ? input.ids.filter((id: unknown) => typeof id === "string") : []);
    else if (input.action === "save") return NextResponse.json(await store.save(user.id, input.state, input.revision));
    else throw new DataError("잘못된 요청입니다.");
    return NextResponse.json({ ok: true });
  } catch (error) { return accountError(error); }
}
