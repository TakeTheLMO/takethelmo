import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    if (isSupabaseConfigured) {
      const user = await getSessionUser();
      await (await createClient()).auth.signOut();
      if (user) await logAuditEvent({ actorId: user.id, action: "auth.logout" });
    }
  } catch {
    // 로그아웃은 실패해도 홈으로 돌려보낸다
  }
  return NextResponse.redirect(new URL("/", request.url), 303);
}
