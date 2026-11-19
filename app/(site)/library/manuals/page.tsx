import { WorkPage } from "@/features/workspace/WorkPage";
import { findNavContext } from "@/config/navigation";
export const metadata = { title: findNavContext("/library/manuals")?.item?.label || "안전관리" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  return <WorkPage path="/library/manuals" query={await searchParams} />;
}
