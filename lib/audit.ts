import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// DB 변경은 트리거가 자동 기록한다. 이 함수는 로그인·로그아웃·비밀번호 변경처럼
// DB 행 변경으로 남지 않는 이벤트를 기록한다. 비밀번호/토큰/이메일 원문은 넣지 말 것.
export async function logAuditEvent(event: {
  actorId?: string | null;
  action: string;
  targetTable?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const h = await headers();
    const { error } = await createAdminClient().rpc("write_audit_log", {
      p_actor: event.actorId ?? null,
      p_action: event.action,
      p_target_table: event.targetTable ?? null,
      p_target_id: event.targetId ?? null,
      p_detail: event.detail ?? null,
      p_request_id: h.get("x-vercel-id") ?? h.get("x-request-id"),
      p_client_info: { user_agent: h.get("user-agent") },
    });
    if (error) console.error("[audit] write failed:", error.message);
  } catch (e) {
    console.error("[audit] write failed:", e instanceof Error ? e.message : e);
  }
}
