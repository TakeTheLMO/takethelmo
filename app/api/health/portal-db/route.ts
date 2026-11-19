import { NextResponse } from "next/server";
import { localAuth } from "@/features/local-auth/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 배포 진단용: 포털 DB 연결 실패 원인을 비밀값 없이 보여준다. (비밀번호·전체 접속 문자열은 절대 응답하지 않음)
function describeUrl(raw: string | undefined) {
  if (!raw) return { set: false };
  try {
    const url = new URL(raw.trim());
    return {
      set: true,
      trimmedDiffers: raw !== raw.trim(),
      protocol: url.protocol,
      hostKind: url.hostname.endsWith(".pooler.supabase.com") ? "pooler" : url.hostname.endsWith(".supabase.co") ? "direct" : "other",
      port: url.port || "(default)",
      userHasProjectRef: /^postgres\.[a-z0-9]{20}$/.test(decodeURIComponent(url.username)),
      passwordSet: url.password.length > 0,
      passwordHasUnencodedSpecial: /[@#/?]/.test(decodeURIComponent(url.password)) && url.password === decodeURIComponent(url.password),
      database: url.pathname,
    };
  } catch { return { set: true, parseable: false }; }
}

export async function GET() {
  const raw = process.env.PORTAL_DATABASE_URL;
  const info = { commit: (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7), branch: process.env.VERCEL_GIT_COMMIT_REF || null, env: process.env.VERCEL_ENV || null, node: process.version, url: describeUrl(raw), adminPasswordSet: (process.env.PORTAL_ADMIN_PASSWORD || "").length >= 12 };
  try {
    const store = await localAuth();
    await store.db.get("SELECT 1 AS ok");
    const users = await store.db.get("SELECT count(*) AS count FROM local_users");
    return NextResponse.json({ ok: true, ...info, users: Number(users?.count) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const e = error as { name?: string; code?: string; message?: string };
    let message = String(e?.message || error);
    if (raw) message = message.split(raw).join("[PORTAL_DATABASE_URL]");
    message = message.replace(/postgres(?:ql)?:\/\/[^\s"']+/g, "[url]");
    return NextResponse.json({ ok: false, ...info, error: { name: e?.name, code: e?.code, message: message.slice(0, 300) } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
