import { redirect } from "next/navigation";
import { portalHref } from "@/config/workspace";
export default async function Page({ params, searchParams }: { params: Promise<{section:string}>; searchParams:Promise<Record<string,string|string[]|undefined>> }) {
 const query = new URLSearchParams(); for (const [key,value] of Object.entries(await searchParams)) if (typeof value === "string") query.set(key,value);
 redirect(portalHref(`/demo/${(await params).section}`)+(query.size ? `?${query}` : ""));
}
