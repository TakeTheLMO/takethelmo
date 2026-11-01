"use server";

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logAuditEvent } from "@/lib/audit";
import { safeNextPath } from "@/lib/safe-redirect";

export type ActionResult = { ok: true; redirectTo: string } | { ok: false; message: string };

const sha256 = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export async function signIn(input: { email: string; password: string; next?: string | null }): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, message: "서비스 설정이 완료되지 않아 로그인할 수 없습니다." };
  const email = String(input.email ?? "").trim();
  const password = String(input.password ?? "");
  if (!email || !password) return { ok: false, message: "이메일과 비밀번호를 입력해 주세요." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      const network = error?.status === 0 || error?.name === "AuthRetryableFetchError";
      await logAuditEvent({
        action: "auth.login_failed",
        detail: { email_sha256: sha256(email), reason: network ? "network" : (error?.code ?? "invalid") },
      });
      return {
        ok: false,
        message: network
          ? "인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
          : "이메일 또는 비밀번호가 올바르지 않습니다.",
      };
    }

    // 비활성 계정·프로필 없음은 로그인 즉시 차단
    const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
    if (profile?.status !== "active") {
      await supabase.auth.signOut();
      await logAuditEvent({ actorId: data.user.id, action: "auth.login_blocked", detail: { reason: "inactive_or_missing_profile" } });
      return { ok: false, message: "사용할 수 없는 계정입니다. 관리자에게 문의해 주세요." };
    }

    await logAuditEvent({ actorId: data.user.id, action: "auth.login" });
    return { ok: true, redirectTo: safeNextPath(input.next) };
  } catch {
    return { ok: false, message: "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
