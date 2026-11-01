import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "접근 권한 없음" };

export default function ForbiddenPage() {
  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-xl py-12 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-brand-600" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-gray-600">이 페이지를 볼 수 있는 권한이 없습니다. 필요하면 관리자에게 문의해 주세요.</p>
        <ButtonLink href="/" variant="outline" className="mt-6">홈으로</ButtonLink>
      </Card>
    </Container>
  );
}
