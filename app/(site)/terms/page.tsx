import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "이용약관" };

// 본문은 운영기관이 확정한 내용으로만 게시한다.
export default function TermsPage() {
  return (
    <>
      <PageHeader title="이용약관" crumbs={[{ label: "이용약관" }]} />
      <Container className="py-8">
        <ComingSoon message="운영기관이 이용약관을 확정하면 이곳에 게시됩니다." />
      </Container>
    </>
  );
}
