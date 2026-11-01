import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SectionLayout } from "@/components/layout/SectionLayout";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { ExternalLinkList } from "@/components/ui/ExternalLinkList";
import { externalLinksFor } from "@/config/external-links";
import { findNavContext } from "@/config/navigation";

type Props = { params: Promise<{ slug: string[] }> };

// 메뉴에 등록됐지만 아직 구현되지 않은 모든 경로의 임시 페이지.
// 실제 페이지를 만들면 해당 경로의 page.tsx 가 이 파일보다 우선한다.
// (예: app/(site)/community/notices/page.tsx 를 만들면 /community/notices 는 그 파일이 처리)
const toPath = (slug: string[]) => `/${slug.join("/")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = findNavContext(toPath((await params).slug));
  return { title: ctx?.item?.label ?? ctx?.group.label };
}

export default async function ComingSoonPage({ params }: Props) {
  const path = toPath((await params).slug);
  const ctx = findNavContext(path);
  if (!ctx) notFound();

  // 그룹 경로(/library 등)에 해당하는 하위 메뉴가 없으면 첫 하위 메뉴로 보낸다.
  if (!ctx.item) {
    const first = ctx.group.items[0];
    if (!first) notFound();
    redirect(first.href);
  }

  return (
    <SectionLayout group={ctx.group} currentHref={ctx.item.href} title={ctx.item.label} description={ctx.item.description}>
      <ComingSoon />
      <ExternalLinkList links={externalLinksFor(ctx.item.href)} />
    </SectionLayout>
  );
}
