import { portalContent } from "@/features/portal-content/server";
import { PublishedContent } from "@/features/portal-content/PublishedContent";
import { getLocalUser } from "@/features/local-auth/session";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "개인정보처리방침" };

// 본문은 운영기관이 확정한 내용으로만 게시한다. 임의의 문안을 넣지 않는다.
// 작성 시 포함 항목: 처리 목적, 처리 항목, 보유기간(profiles.retention_until 과 일치), 제3자 제공, 위탁,
// 정보주체 권리, 안전성 확보조치, 개인정보 보호책임자, 시행일 및 변경 이력.
// 포털 DB 내용(관리자 게시)을 요청마다 읽는다. 빌드 시 DB 에 접속하지 않는다.
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const document = await (await portalContent()).published("/privacy"), local = await getLocalUser();
  return (
    <>
      <PageHeader title={document.page.title} crumbs={[{ label: "개인정보처리방침" }]} />
      <Container className="space-y-5 py-8"><PublishedContent document={document} admin={local?.canSwitchRole} />
        {!document.page.body && !document.posts.length && <ComingSoon message="운영기관이 개인정보처리방침을 확정하면 이곳에 게시됩니다." />}
      </Container>
    </>
  );
}
