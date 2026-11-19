import { portalContent } from "@/features/portal-content/server";
import { PublishedContent } from "@/features/portal-content/PublishedContent";
import { getLocalUser } from "@/features/local-auth/session";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "이용약관" };

// 본문은 운영기관이 확정한 내용으로만 게시한다.
export default async function TermsPage() {
  const document = await (await portalContent()).published("/terms"), local = await getLocalUser();
  return (
    <>
      <PageHeader title={document.page.title} crumbs={[{ label: "이용약관" }]} />
      <Container className="space-y-5 py-8"><PublishedContent document={document} admin={local?.canSwitchRole} />
        {!document.page.body && !document.posts.length && <ComingSoon message="운영기관이 이용약관을 확정하면 이곳에 게시됩니다." />}
      </Container>
    </>
  );
}
