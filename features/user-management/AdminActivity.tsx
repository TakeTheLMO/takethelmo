"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDemo } from "../demo/Store";
import { Button } from "@/components/ui/Button";
import { Panel, Empty, Badge } from "@/components/ui/DemoUI";
export type AdminEvent = { id: string; userId: string; name: string; email: string; kind: string; title: string; at: string; readAt: string | null };
export function useAdminActivity(enabled: boolean) {
  const [data, setData] = useState<{ unread: number; events: AdminEvent[] }>({ unread: 0, events: [] });
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch("/api/account-data?view=activity", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData(await response.json()); setError("");
    } catch { setError("사용자 활동 알림을 불러오지 못했습니다."); }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    void reload(); const timer = setInterval(() => void reload(), 10000);
    const onChange = () => void reload(); addEventListener("account-activity", onChange); addEventListener("focus", onChange);
    return () => { clearInterval(timer); removeEventListener("account-activity", onChange); removeEventListener("focus", onChange); };
  }, [enabled, reload]);
  async function mark(ids: string[]) {
    try {
      const response = await fetch("/api/account-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read", ids }) });
      if (!response.ok) throw new Error();
      dispatchEvent(new Event("account-activity"));
    } catch { setError("알림 읽음 처리를 저장하지 못했습니다."); }
  }
  return { ...data, error, reload, mark };
}
export function AdminActivity() {
  const { user } = useDemo();
  const { events, unread, error, reload, mark } = useAdminActivity(user.canSwitchRole);
  if (!user.canSwitchRole) return null;
  return <Panel title="사용자 등록·업로드 알림" aside={<Badge>{unread}개 미확인</Badge>}>
    <div className="mb-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => void reload()}>활동 새로고침</Button>
      <Button variant="outline" disabled={!unread} onClick={() => void mark(events.filter(row => !row.readAt).map(row => row.id))}>사용자 알림 모두 읽음</Button></div>
    {error && <p role="alert">{error}</p>}
    <div className="space-y-3">{events.map(row => <article key={row.id} className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><Badge muted={!!row.readAt}>{row.kind}</Badge><span className="text-xs text-gray-500">{new Date(row.at).toLocaleString("ko-KR")}</span></div>
      <Link onClick={() => void mark([row.id])} className="mt-3 block break-words font-semibold text-brand-800" href={`/management/users?user=${encodeURIComponent(row.userId)}`}>{row.name} · {row.title}</Link>
      <p className="mt-2 break-all text-xs text-gray-500">{row.email}</p>
      {!row.readAt && <button onClick={() => void mark([row.id])} className="mt-3 text-xs text-brand-700 underline">사용자 알림 읽음 표시</button>}
    </article>)}{!events.length && <Empty>사용자가 자료를 등록하면 이곳에 표시됩니다.</Empty>}</div>
  </Panel>;
}
