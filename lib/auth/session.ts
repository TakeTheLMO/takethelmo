import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile } from "@/types";

export type SessionUser = {
  id: string;
  email: string | null;
  profile: Pick<Profile, "role" | "status" | "full_name" | "organization_id">;
};

// 실패하면 항상 null(비로그인)로 취급한다: 환경변수 누락, 인증 서버 오류, 프로필 없음, 비활성 계정.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser(); // 쿠키가 아니라 Auth 서버에서 검증
    if (error || !data.user) return null;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,status,full_name,organization_id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || !profile || profile.status !== "active") return null;
    return { id: data.user.id, email: data.user.email ?? null, profile: profile as SessionUser["profile"] };
  } catch {
    return null;
  }
});
