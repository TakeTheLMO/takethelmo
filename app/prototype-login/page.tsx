import { redirect } from "next/navigation";
import { portalHref } from "@/config/workspace";
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}) { const {next}=await searchParams; redirect("/login"+(next ? `?next=${encodeURIComponent(portalHref(next))}`:"")); }
