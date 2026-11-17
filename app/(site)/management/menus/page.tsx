import { WorkPage } from "@/features/workspace/WorkPage";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <WorkPage path="/management/menus" query={await searchParams} />;
}
