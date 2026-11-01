import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSessionUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "로그인" };

const errorMessages: Record<string, string> = {
  callback: "인증 링크가 만료되었거나 올바르지 않습니다. 비밀번호 재설정을 다시 요청하거나 관리자에게 초대를 다시 요청해 주세요.",
  config: "서비스 설정이 완료되지 않았습니다.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  if (await getSessionUser()) redirect(safeNextPath(next));

  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="mt-1 text-sm text-gray-600">계정은 관리자 초대로 발급됩니다.</p>
        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800" role="status">
            Supabase 환경변수가 설정되지 않아 로그인할 수 없습니다. .env.local 파일을 확인해 주세요.
          </p>
        )}
        {error && errorMessages[error] && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessages[error]}</p>
        )}
        <Suspense>
          <LoginForm disabled={!isSupabaseConfigured} />
        </Suspense>
      </Card>
    </Container>
  );
}
