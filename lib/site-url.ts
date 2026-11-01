import "server-only";
import { headers } from "next/headers";

// 인증 메일의 리다이렉트 기준 주소. 운영에서는 NEXT_PUBLIC_SITE_URL을 반드시 설정하고
// Supabase > Authentication > URL Configuration의 Redirect URLs에도 같은 주소를 등록한다.
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
