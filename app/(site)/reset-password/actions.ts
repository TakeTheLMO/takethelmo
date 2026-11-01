"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

// "use server" 파일은 async 함수만 export 할 수 있다. 다른 곳에서 필요하면 lib/ 로 옮길 것.
const MIN_PASSWORD_LENGTH = 12;

export async function updatePassword(input: { password: string; confirm: string; mode?: string }) {
  const { password, confirm } = input;
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false as const, message: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  if (password !== confirm) return { ok: false as const, message: "비밀번호 확인이 일치하지 않습니다." };
  try {
    const user = await getSessionUser(); // 재설정/초대 링크로 만들어진 세션이 있어야 한다
    if (!user) return { ok: false as const, message: "링크가 만료되었습니다. 다시 요청해 주세요." };
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false as const, message: "비밀번호를 변경하지 못했습니다. 더 복잡한 비밀번호로 다시 시도해 주세요." };
    await logAuditEvent({ actorId: user.id, action: input.mode === "invite" ? "auth.invite_accepted" : "auth.password_changed" });
    return { ok: true as const };
  } catch {
    return { ok: false as const, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
