"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { requestPasswordReset } from "./actions";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setPending(true);
    setResult(null);
    try {
      setResult(await requestPasswordReset(email));
    } catch {
      setResult({ ok: false, message: "네트워크 오류가 발생했습니다. 다시 시도해 주세요." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        이메일
        <input name="email" type="email" required autoComplete="email"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600" />
      </label>
      {result && (
        <p className={result.ok ? "text-sm text-brand-800" : "text-sm text-red-600"} role={result.ok ? "status" : "alert"}>
          {result.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "요청 중" : "재설정 메일 보내기"}</Button>
    </form>
  );
}
