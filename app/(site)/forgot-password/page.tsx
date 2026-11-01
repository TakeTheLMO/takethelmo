import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "비밀번호 재설정" };

export default function ForgotPasswordPage() {
  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-bold">비밀번호 재설정</h1>
        <p className="mt-1 text-sm text-gray-600">계정 이메일을 입력하면 재설정 링크를 보내 드립니다.</p>
        <ForgotPasswordForm />
        <p className="mt-4 text-center text-sm"><Link href="/login" className="text-gray-600 hover:text-brand-700">로그인으로 돌아가기</Link></p>
      </Card>
    </Container>
  );
}
