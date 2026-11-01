import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// service_role 키: RLS를 우회하므로 서버 전용 코드(감사로그 기록, 초대 등)에서만 사용한다.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) throw new Error("Supabase 서버 환경변수가 설정되지 않았습니다.");
  return createSupabaseClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
