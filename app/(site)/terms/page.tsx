import { portalContent } from "@/features/portal-content/server";
import { PublishedContent } from "@/features/portal-content/PublishedContent";
import { getLocalUser } from "@/features/local-auth/session";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "이용약관" };

// 본문은 운영기관이 확정한 내용으로만 게시한다.
// 포털 DB 내용(관리자 게시)을 요청마다 읽는다. 빌드 시 DB 에 접속하지 않는다.
export const dynamic = "force-dynamic";

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
