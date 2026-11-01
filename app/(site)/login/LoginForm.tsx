"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { signIn } from "./actions";

const inputClass = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 disabled:bg-gray-100";

export function LoginForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setPending(true);
    try {
      const result = await signIn({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        next: params.get("next"),
      });
      if (!result.ok) return setError(result.message);
      router.replace(result.redirectTo);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false); // 어떤 경로로 끝나도 로딩 상태를 해제한다
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        이메일
        <input name="email" type="email" required autoComplete="email" disabled={disabled} className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        비밀번호
        <input name="password" type="password" required autoComplete="current-password" disabled={disabled} className={inputClass} />
      </label>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={disabled || pending}>
        {pending ? "로그인 중" : "로그인"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-gray-600 hover:text-brand-700">비밀번호를 잊으셨나요?</Link>
      </p>
    </form>
  );
}
