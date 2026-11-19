"use client";
import Link from "next/link";
import { useState } from "react";
import { Bell } from "lucide-react";
import { getNotifications, useDemo } from "../demo/Store";
import { useAdminActivity } from "../user-management/AdminActivity";
import { accountRoles } from "../local-auth/profile";
import { recoveryCopies } from "../user-management/recovery";
export function AccountTools() {
  const { user, state } = useDemo(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const { unread } = useAdminActivity(user.canSwitchRole);
  const count = getNotifications(state).filter(row => !(state.read[user.role] || []).includes(row.id)).length + unread;
  return <div className="flex shrink-0 items-center gap-1 sm:gap-2">
    {user.canSwitchRole && <Link href="/management/users" className="hidden shrink-0 whitespace-nowrap rounded-md border border-brand-700 px-3 py-2 text-sm text-brand-800 sm:block">관리자</Link>}
    <Link href="/mypage/notifications" aria-label={`알림 ${count}개`} className="relative rounded-md p-2 text-brand-800"><Bell size={20} />{count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-brand-700 px-1 text-[10px] text-white">{count > 99 ? "99+" : count}</span>}</Link>
    <Link href="/mypage" className="hidden max-w-28 truncate text-xs lg:block" title={user.email}><strong>{user.name}</strong><span className="block text-gray-500">{accountRoles[user.role]}</span></Link>
    <button className="whitespace-nowrap rounded-md px-2 py-2 text-xs text-gray-600 hover:bg-gray-100 sm:text-sm" disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try { const response = await fetch("/api/auth/logout", { method: "POST" }); if (!response.ok) throw new Error(); location.assign("/portal"); }
      catch { setError("로그아웃하지 못했습니다."); setBusy(false); }
    }}>{busy ? "처리 중" : "로그아웃"}</button>{error && <span role="alert" className="max-w-28 text-xs text-red-700">{error}</span>}
  </div>;
}
export function SaveStatus() {
  const { syncStatus, retrySync, hasBackup, user, state } = useDemo();
  return <div className="border-b border-gray-100 bg-gray-50"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-3 px-4 py-2 text-xs text-gray-500 sm:px-6" role="status">
    <span>{user.name} · {accountRoles[user.role]}</span><span>{syncStatus}</span>
    {syncStatus.includes("실패") && <button onClick={retrySync} className="text-brand-700 underline">저장 재시도</button>}
    {syncStatus.includes("복구 사본 공간 부족") && <button className="text-brand-700 underline" onClick={async () => (await import("../demo/files")).downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), "현재-입력.json")}>현재 입력 다운로드</button>}
    {hasBackup && <button className="text-brand-700 underline" onClick={async () => { const copies = recoveryCopies(localStorage, `takethelmo:frontend-demo:v1:user:${user.id}`); (await import("../demo/files")).downloadBlob(new Blob([JSON.stringify({ copies }, null, 2)], { type: "application/json" }), "입력-복구사본.json"); }}>저장 전 입력 다운로드</button>}
  </div></div>;
}
