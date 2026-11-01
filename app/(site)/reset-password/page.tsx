import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "비밀번호 설정" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode = "recovery" } = await searchParams;
  await requireUser("/reset-password"); // 이메일 링크(콜백)를 거친 세션이 없으면 로그인으로
  const invite = mode === "invite";
  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-bold">{invite ? "계정 설정" : "새 비밀번호 설정"}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {invite ? "초대를 수락하려면 사용할 비밀번호를 설정해 주세요." : "새로 사용할 비밀번호를 입력해 주세요."}
        </p>
        <ResetPasswordForm mode={mode} />
      </Card>
    </Container>
  );
}
