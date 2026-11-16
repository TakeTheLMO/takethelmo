import { notFound } from "next/navigation";
import {
  SearchPage,
  Library,
  Assistant,
  Guides,
  Assessment,
  Emergency,
} from "@/features/demo/Discovery";
import { Training } from "@/features/demo/Training";
import { Requests } from "@/features/demo/Requests";
import { Inspections } from "@/features/demo/Inspections";
import { Incidents } from "@/features/demo/Incidents";
import { Labs } from "@/features/demo/Labs";
import { Notifications } from "@/features/demo/Notifications";
export default async function DemoSection({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  const query = await searchParams;
  switch (section) {
    case "search":
      return (
        <SearchPage initialQuery={typeof query.q === "string" ? query.q : ""} />
      );
    case "library":
      return (
        <Library
          selectedDoc={typeof query.doc === "string" ? query.doc : undefined}
        />
      );
    case "assistant":
      return <Assistant />;
    case "guides":
      return <Guides />;
    case "assessment":
      return <Assessment />;
    case "emergency":
      return <Emergency />;
    case "training":
      return <Training />;
    case "requests":
      return (
        <Requests
          initialKind={typeof query.kind === "string" ? query.kind : undefined}
        />
      );
    case "inspections":
      return <Inspections />;
    case "incidents":
      return <Incidents />;
    case "labs":
      return <Labs />;
    case "notifications":
      return <Notifications />;
    default:
      notFound();
  }
}
