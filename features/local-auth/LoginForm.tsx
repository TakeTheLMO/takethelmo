"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { safeNextPath } from "@/lib/safe-redirect";
import { signupRoles } from "./profile";
export function LocalLoginForm({ next, initialRegister = false }: { next?: string; initialRegister?: boolean }) {
  const [register, setRegister] = useState(initialRegister);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inputClass = "mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm";
  return <>
    <div className="mt-6 flex gap-2" role="group" aria-label="계정 메뉴">
      {[false, true].map(value => <button key={String(value)} type="button" aria-pressed={register === value} disabled={pending}
        onClick={() => { setRegister(value); setError(""); }} className={`flex-1 rounded-lg px-4 py-2 text-sm ${register === value ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-700"}`}>{value ? "회원가입" : "로그인"}</button>)}
    </div>
    <form key={String(register)} className="mt-6 space-y-5" onSubmit={async e => {
      e.preventDefault(); if (pending) return;
      const data = new FormData(e.currentTarget); setPending(true); setError("");
      try {
        const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(data)),
        });
        const result = await response.json();
        if (!response.ok) { setError(result.message); return; }
        window.location.assign(safeNextPath(next, "/mypage"));
      } catch { setError("서버에 연결하지 못했습니다. 연결 상태를 확인해 주세요."); }
      finally { setPending(false); }
    }}>
      {register && <label className="block text-sm font-medium">이름<input name="name" required minLength={2} maxLength={40} autoComplete="name" className={inputClass} disabled={pending} /></label>}
      <label className="block text-sm font-medium">{register ? "이메일" : "아이디 또는 이메일"}<input name="email" type={register ? "email" : "text"} required maxLength={254} autoComplete={register ? "email" : "username"} className={inputClass} disabled={pending} /></label>
      {register && <div>
        <label htmlFor="signup-role" className="block text-sm font-medium">역할</label><select id="signup-role" name="role" required defaultValue="" className={inputClass} disabled={pending}>
          <option value="" disabled>역할 선택</option>
          {Object.entries(signupRoles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <p className="mt-2 text-xs leading-5 text-gray-500">소속 업무에 맞는 역할을 선택하세요. 가입 역할은 본인 자료의 작성 권한에 적용되며, 다른 사용자를 관리하는 권한은 부여되지 않습니다.</p>
      </div>}
      <label className="block text-sm font-medium">비밀번호<input name="password" type="password" required minLength={register ? 8 : 1} maxLength={128} autoComplete={register ? "new-password" : "current-password"} className={inputClass} disabled={pending} />{register && <span className="mt-2 block text-xs text-gray-500">8자 이상 입력해 주세요.</span>}</label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "처리 중…" : register ? "가입하고 시작하기" : "로그인하기"}</Button>
    </form>
  </>;
}
