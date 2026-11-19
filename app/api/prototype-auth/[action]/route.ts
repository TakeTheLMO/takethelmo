import { NextRequest, NextResponse } from "next/server";
import { localAuth, SESSION_SECONDS } from "@/features/local-auth/database";
import { LOCAL_SESSION_COOKIE } from "@/features/local-auth/session";
import { validateRole } from "@/features/local-auth/profile";
export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  // Next.js may normalize nextUrl to localhost even when accessed through 127.0.0.1.
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host")}`;
  if (request.headers.get("origin") !== expectedOrigin) return NextResponse.json({ message: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  const { action } = await params;
  if (!["login", "register", "logout"].includes(action)) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 404 });
  try {
    const store = localAuth();
    const cookie = { httpOnly: true, sameSite: "lax" as const, secure: request.nextUrl.protocol === "https:", path: "/" };
    if (action === "logout") {
      store.logout(request.cookies.get(LOCAL_SESSION_COOKIE)?.value || "");
      const response = NextResponse.json({ ok: true });
      response.cookies.set(LOCAL_SESSION_COOKIE, "", { ...cookie, maxAge: 0 });
      return response;
    }
    if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ message: "입력 내용이 너무 깁니다." }, { status: 413 });
    const input = await request.json();
    const email = typeof input.email === "string" ? input.email : "";
    const password = typeof input.password === "string" ? input.password : "";
    const name = typeof input.name === "string" ? input.name : "";
    store.attempt(`${action}:${email.trim().toLowerCase()}`);
    store.attempt(`total:${action}`, 100);
    if (action === "register") validateRole(
      typeof input.role === "string" ? input.role : "",
    );
    const user = action === "register" ? store.register(name, email, password, input.role) : store.login(email, password);
    const token = store.session(user);
    const oldToken = request.cookies.get(LOCAL_SESSION_COOKIE)?.value;
    if (oldToken) store.logout(oldToken);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(LOCAL_SESSION_COOKIE, token, { ...cookie, maxAge: SESSION_SECONDS });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const expected = /입력해 주세요|선택해 주세요|이메일|비밀번호|요청이 너무 많|시스템 관리자는|예시 데이터 전용/.test(message);
    return NextResponse.json({ message: expected ? message : "로그인 저장소를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요." }, { status: expected ? 400 : 503 });
  }
}
