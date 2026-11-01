import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "개인정보처리방침" };

// 본문은 운영기관이 확정한 내용으로만 게시한다. 임의의 문안을 넣지 않는다.
// 작성 시 포함 항목: 처리 목적, 처리 항목, 보유기간(profiles.retention_until 과 일치), 제3자 제공, 위탁,
// 정보주체 권리, 안전성 확보조치, 개인정보 보호책임자, 시행일 및 변경 이력.
export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="개인정보처리방침" crumbs={[{ label: "개인정보처리방침" }]} />
      <Container className="py-8">
        <ComingSoon message="운영기관이 개인정보처리방침을 확정하면 이곳에 게시됩니다." />
      </Container>
    </>
  );
}
