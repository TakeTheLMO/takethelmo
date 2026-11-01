import { SearchX } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-xl py-12 text-center">
        <SearchX className="mx-auto h-10 w-10 text-brand-600" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-gray-600">주소가 바뀌었거나 존재하지 않는 페이지입니다.</p>
        <ButtonLink href="/" variant="outline" className="mt-6">홈으로</ButtonLink>
      </Card>
    </Container>
  );
}
