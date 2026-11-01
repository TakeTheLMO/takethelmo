// 로그인/콜백 후 이동 경로는 같은 사이트의 상대 경로만 허용한다 (오픈 리다이렉트 방지).
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  try {
    const u = new URL(next, "http://localhost");
    if (u.origin !== "http://localhost") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
