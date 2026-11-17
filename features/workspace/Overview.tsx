"use client";
import Link from "next/link";
import { Panel, Empty, Badge } from "@/components/ui/DemoUI";
import { useDemo } from "../demo/Store";
import { accountRoles } from "../local-auth/profile";
import { AdminActivity } from "../user-management/AdminActivity";
export function Overview() {
  const { state, user } = useDemo();
  return <div className="space-y-6">
    <Panel><h2 className="text-lg font-semibold">{user.name}님의 업무 현황</h2><p className="mt-2 text-sm text-gray-500">{accountRoles[user.role]} · 등록한 자료와 진행 상태를 확인하세요.</p></Panel>
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[
      ["진행 중인 신청", state.requests.filter(row => !["승인", "반려", "답변 완료"].includes(row.status)).length, "/mypage/requests"],
      ["등록한 이수증", state.enrollments.filter(row => row.status === "등록 완료").length, "/training/records"],
      ["미종결 개선조치", state.actions.filter(row => row.status !== "종결").length, "/safety/corrective-actions"],
      ["관리대장 기록", state.ledger.length, "/lmo/ledger"],
    ].map(([label, count, href]) => <Link key={label} href={String(href)} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-600"><p className="text-xs text-gray-500">{label}</p><p className="mt-4 text-3xl font-semibold text-brand-800">{count}<span className="ml-1 text-sm">건</span></p></Link>)}</div>
    <Panel title="최근 신청·문의"><div className="space-y-3">{state.requests.slice(-5).reverse().map(row => <Link key={row.id} href="/mypage/requests" className="flex flex-wrap justify-between gap-2 rounded-lg border border-gray-100 p-4 text-sm"><span>{row.title}</span><Badge muted>{row.status}</Badge></Link>)}{!state.requests.length && <Empty>등록한 신청·문의가 없습니다. 신청·사전 문의에서 작성할 수 있습니다.</Empty>}</div></Panel>
    {user.canSwitchRole && <AdminActivity />}
  </div>;
}
