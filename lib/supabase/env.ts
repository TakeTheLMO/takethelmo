export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase 대시보드의 새 이름(Publishable key)과 예전 이름(anon key) 모두 받는다. 둘 다 브라우저 공개용 키다.
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
