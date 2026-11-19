"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel, Empty } from "@/components/ui/DemoUI";
import { useDemo } from "../demo/Store";
import { contentRecords, filesInState } from "../user-management/records";
export function PortalHighlights() {
  const { user, state } = useDemo();
  const [summary, setSummary] = useState<{ users: number; records: { userId: string; title: string; userName: string; category: string; data: { status?: string } }[] } | null>(null);
  useEffect(() => {
    if (!user.canSwitchRole) return;
    let active = true;
    void Promise.all([fetch("/api/account-data?view=users").then(r => r.ok ? r.json() : []), fetch("/api/account-data?view=records").then(r => r.ok ? r.json() : [])]).then(([users, records]) => { if (active) setSummary({ users: users.length, records }); }).catch(() => {});
    return () => { active = false; };
  }, [user.canSwitchRole]);
  const recent = summary ? summary.records.slice(0, 5).map(row => ({ title: `${row.userName} · ${row.title}`, href: `/management/users?user=${row.userId}` })) : contentRecords(state).slice(-5).reverse().map(row => ({ title: row.title, href: "/mypage" }));
  return <div className="space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">{user.name}님의 안전관리 현황</h2><p className="mt-2 text-sm text-gray-500">계정에 등록된 실제 업무 자료를 기준으로 표시합니다.</p></div><Link href="/mypage" className="text-sm text-brand-700">내 업무 전체보기 →</Link></div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[
      [user.canSwitchRole ? "관리 중인 사용자" : "등록한 신청·문의", summary?.users ?? state.requests.length, user.canSwitchRole ? "/management/users" : "/mypage/requests"],
      [user.canSwitchRole ? "사용자 등록 자료" : "등록한 이수증", summary?.records.length ?? state.enrollments.filter(row => row.file).length, user.canSwitchRole ? "/management/users" : "/training/records"],
      ["미종결 개선조치", user.canSwitchRole ? summary?.records.filter(row => row.category === "actions" && row.data.status !== "종결").length || 0 : state.actions.filter(row => row.status !== "종결").length, user.canSwitchRole ? "/management/users?category=actions" : "/safety/corrective-actions"],
      ["미종결 사고 기록", user.canSwitchRole ? summary?.records.filter(row => row.category === "incidents" && row.data.status !== "종결").length || 0 : state.incidents.filter(row => row.status !== "종결").length, user.canSwitchRole ? "/management/users?category=incidents" : "/safety/incidents"],
    ].map(([label, count, href]) => <Link key={label} href={String(href)} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-500"><p className="text-sm text-gray-500">{label}</p><strong className="mt-4 block text-3xl text-brand-800">{count}</strong></Link>)}</div>
    <div className="grid gap-6 md:grid-cols-2"><Panel title="최근 등록 자료"><div className="divide-y divide-gray-100">{recent.map((row, index) => <Link key={index} href={row.href} className="block break-words py-3 text-sm text-gray-700 hover:text-brand-700">{row.title}</Link>)}{!recent.length && <Empty>아직 등록한 자료가 없습니다.</Empty>}</div></Panel>
      <Panel title="자주 사용하는 업무"><div className="grid grid-cols-2 gap-3">{[["신청·사전 문의", "/mypage/requests"], ["교육 이수증 등록", "/training/certificates"], ["LMO 확인 지원", "/lmo/assessment"], ["관리대장 작성", "/lmo/ledger"], ["상황별 가이드", "/support/guides"], ["전체 알림", "/mypage/notifications"]].map(([title, href]) => <Link key={href} href={href} className="rounded-lg border border-gray-200 p-3 text-sm hover:border-brand-600">{title}</Link>)}</div></Panel></div>
  </div>;
}
export function PersonalFiles() {
  const { state, user } = useDemo(), files = filesInState(state);
  return <Panel title="내가 등록한 첨부 자료"><div className="space-y-3">{files.map(file => <a key={file.id} className="block break-all text-sm text-brand-700 underline" href={`/api/account-files?user=${user.id}&id=${encodeURIComponent(file.id)}`}>{file.name}</a>)}{!files.length && <Empty>등록한 첨부 자료가 없습니다. 교육·점검·사고 기록에 첨부하면 이곳에서도 확인할 수 있습니다.</Empty>}</div></Panel>;
}
