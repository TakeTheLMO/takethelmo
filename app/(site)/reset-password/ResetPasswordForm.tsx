"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updatePassword } from "./actions";

const inputClass = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600";

export function ResetPasswordForm({ mode }: { mode: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const result = await updatePassword({
        password: String(form.get("password") ?? ""),
        confirm: String(form.get("confirm") ?? ""),
        mode,
      });
      if (!result.ok) return setError(result.message);
      router.replace("/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        새 비밀번호 (12자 이상)
        <input name="password" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        새 비밀번호 확인
        <input name="confirm" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
      </label>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "저장 중" : "비밀번호 저장"}</Button>
    </form>
  );
}
