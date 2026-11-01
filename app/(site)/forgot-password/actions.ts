"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSiteUrl } from "@/lib/site-url";
import { logAuditEvent } from "@/lib/audit";

// 계정 존재 여부를 알 수 없도록 결과 메시지는 항상 같다 (오류 시에만 다른 메시지).
export async function requestPasswordReset(email: string): Promise<{ ok: boolean; message: string }> {
  const generic = { ok: true, message: "입력하신 이메일로 가입된 계정이 있다면 재설정 안내 메일이 발송됩니다." };
  if (!isSupabaseConfigured) return { ok: false, message: "서비스 설정이 완료되지 않았습니다." };
  const value = String(email ?? "").trim();
  if (!value) return { ok: false, message: "이메일을 입력해 주세요." };
  try {
    const supabase = await createClient();
    const redirectTo = `${await getSiteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
    const { error } = await supabase.auth.resetPasswordForEmail(value, { redirectTo });
    if (error && (error.status === 0 || error.name === "AuthRetryableFetchError")) {
      return { ok: false, message: "인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }
    await logAuditEvent({ action: "auth.password_reset_requested" });
    return generic;
  } catch {
    return { ok: false, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
