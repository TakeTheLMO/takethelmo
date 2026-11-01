import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { logAuditEvent } from "@/lib/audit";

// 이메일 링크(초대, 이메일 인증, 비밀번호 재설정)가 도착하는 곳.
// PKCE(code)와 token_hash 두 방식을 모두 처리하고, 실패하면 항상 로그인 화면으로 보낸다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"), "/");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!isSupabaseConfigured) return NextResponse.redirect(new URL("/login?error=config", origin));

  try {
    const supabase = await createClient();
    let failed = true;
    if (code) {
      failed = !!(await supabase.auth.exchangeCodeForSession(code)).error;
    } else if (tokenHash && type) {
      failed = !!(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
    }
    if (!failed) {
      await logAuditEvent({ action: "auth.callback_ok", detail: { type: type ?? "pkce" } });
      return NextResponse.redirect(new URL(next, origin));
    }
  } catch {
    // 아래의 실패 처리로 이동
  }
  await logAuditEvent({ action: "auth.callback_failed", detail: { type: type ?? "pkce" } });
  return NextResponse.redirect(new URL("/login?error=callback", origin));
}
