import { WorkPage } from "@/features/workspace/WorkPage";
import { findNavContext } from "@/config/navigation";
export const metadata = { title: findNavContext("/lmo/grades")?.item?.label || "안전관리" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  return <WorkPage path="/lmo/grades" query={await searchParams} />;
}
