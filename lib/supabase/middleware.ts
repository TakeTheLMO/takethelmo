import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_PREFIXES } from "@/config/roles";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  const target = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", target);
  return NextResponse.redirect(url);
}

// 1차 방어선일 뿐이다. 역할 검사는 각 page/route의 requireRole과 DB RLS가 담당한다.
export async function updateSession(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));

  // 환경변수가 없으면 보호 경로는 열어 주지 않는다.
  if (!isSupabaseConfigured) return isProtected ? redirectToLogin(request) : NextResponse.next({ request });

  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: CookieToSet[]) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (isProtected && (error || !data.user)) return redirectToLogin(request);
  } catch {
    if (isProtected) return redirectToLogin(request); // 인증 서버 오류 시에도 거부
  }
  return response;
}
