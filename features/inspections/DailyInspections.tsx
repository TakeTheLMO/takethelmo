"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge, Field, inputClass, Panel, Timeline } from "@/components/ui/DemoUI";
import { useDemo } from "../demo/Store";
import { downloadBlob } from "../demo/files";
import { timeLabel, uid, type Inspection } from "../demo/model";
import { dailyAnswerLabel, dailyAnswers, dailyChecklist, inspectionStatus, koreaDate, monthDays, monthlyInspectionCsv, validateDaily } from "./daily";

export function DailyInspections() {
  const { state, user, syncStatus } = useDemo();
  const [date, setDate] = useState(koreaDate), [month, setMonth] = useState(() => koreaDate().slice(0, 7));
  const [editing, setEditing] = useState(false);
  const days = monthDays(month), current = state.inspections.find(row => row.daily?.date === date);
  const records = state.inspections.filter(row => row.daily?.date.startsWith(month));
  const start = days.length ? new Date(`${days[0]}T00:00:00Z`).getUTCDay() : 0;
  return <div className="space-y-5">
    <Panel title="일상점검 달력" aside={<Button variant="outline" disabled={!days.length} onClick={() => downloadBlob(new Blob(["\uFEFF", monthlyInspectionCsv(state.inspections, month)], { type: "text/csv;charset=utf-8" }), `일상점검_${month}.csv`)}>월간 점검표 다운로드</Button>}>
      <p className="text-sm leading-6 text-gray-600">내 계정의 연구실 점검 기록을 날짜별로 관리합니다. 항목은 제공된 대학 화면을 참고한 초안이며, 실제 점검 항목·주기는 기관 기준을 확인하세요.</p>
      <div className="my-4 flex flex-wrap items-end justify-between gap-3"><Field label="점검 월"><input type="month" className={inputClass} value={month} max={koreaDate().slice(0, 7)} onChange={e => { if (monthDays(e.target.value).length) { setMonth(e.target.value); setDate(e.target.value === koreaDate().slice(0, 7) ? koreaDate() : `${e.target.value}-01`); setEditing(false); } }} /></Field><p className="text-xs leading-6 text-gray-500">기록 {records.length}일 · 확인 {records.filter(row => row.daily?.confirmation).length}일<br />기록 없음은 법적 미이행 판정을 뜻하지 않습니다.</p></div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-label="월간 점검 달력">
        {["일", "월", "화", "수", "목", "금", "토"].map(day => <div key={day} className="py-2 text-center text-xs text-gray-500">{day}</div>)}
        {Array.from({ length: start }, (_, i) => <div key={`space-${i}`} />)}
        {days.map(day => { const row = records.find(row => row.daily?.date === day), future = day > koreaDate(); return <button key={day} type="button" disabled={future} aria-pressed={day === date} aria-label={`${day} ${future ? "예정일" : inspectionStatus(row)}`} onClick={() => { setDate(day); setEditing(false); }} className={`min-h-20 min-w-0 rounded-lg border p-1.5 text-left disabled:opacity-40 sm:p-3 ${day === date ? "border-brand-600 bg-brand-50" : "border-gray-200"}`}><span className="block text-sm font-semibold">{Number(day.slice(-2))}</span><span className="mt-1 block break-keep text-[10px] leading-4 sm:text-xs">{future ? "—" : row?.daily?.mode === "na" ? "미해당" : row ? Object.values(row.results).includes("부적합") ? "불량 있음" : "점검 완료" : "기록 없음"}</span>{row?.daily?.confirmation && <span className="block text-[10px] text-brand-700">확인 완료</span>}</button>; })}
      </div>
    </Panel>
    <Panel title={`${date} 점검 기록`} aside={<Button disabled={syncStatus !== "서버 저장 완료"} onClick={() => setEditing(!editing)} aria-expanded={editing}>{editing ? "작성 닫기" : current ? "점검 정정" : "+ 점검 시작"}</Button>}>
      <p className="text-xs leading-6 text-gray-500">점검자 {current?.inspector || user.name} · {inspectionStatus(current)}</p>
      {editing ? <DailyForm key={`${date}-${current?.id || "new"}`} date={date} record={current} onClose={() => setEditing(false)} /> : current?.daily ? <div className="mt-4 space-y-4">
        <p className="text-sm">연구실: {current.daily.labName}</p>
        <p className="text-xs text-gray-500">서버 등록 {timeLabel(current.at)} · 항목 버전 {current.daily.template} · PPT 참고·프로젝트 제안</p>
        {current.daily.mode === "na" ? <p className="rounded-lg bg-gray-50 p-4 text-sm">일일 미해당 사유: {current.daily.naReason}</p> : <div className="space-y-2">{current.daily.items.map(item => <div key={item.id} className="rounded-lg border border-gray-100 p-3 text-sm"><div className="flex items-start justify-between gap-3"><p className="min-w-0">{item.title}</p><Badge muted>{dailyAnswerLabel[current.results[item.id]]}</Badge></div>{current.daily!.itemNotes[item.id] && <p className="mt-2 whitespace-pre-wrap break-words text-gray-600">조치사항: {current.daily!.itemNotes[item.id]}</p>}</div>)}</div>}
        {current.note && <p className="whitespace-pre-wrap break-words text-sm">메모: {current.note}</p>}
        <div className="rounded-lg bg-gray-50 p-4 text-sm leading-6">{current.daily.confirmation ? <><p className="font-medium">포털 관리자 확인 · {current.daily.confirmation.actor}</p><p>{timeLabel(current.daily.confirmation.at)} · {current.daily.confirmation.note}</p></> : <p>포털 관리자 확인 대기</p>}<p className="mt-1 text-xs text-gray-500">기관 책임자의 승인·전자서명을 대신하지 않습니다. 점검 내용 정정 시 재확인이 필요하며, 개선조치는 별도로 검토합니다.</p></div>
        <details><summary className="cursor-pointer text-sm font-medium text-brand-700">점검·확인 이력 ({current.daily.history.length})</summary><div className="mt-3"><Timeline items={current.daily.history} /></div></details>
      </div> : <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">선택한 날짜에 등록한 점검이 없습니다. 점검하거나 사유를 적어 일일 미해당으로 기록하세요.</p>}
      {user.canSwitchRole && <Link className="mt-4 inline-block text-sm font-medium text-brand-700" href="/management/users?category=inspections">사용자별 점검 조회·정정·확인 →</Link>}
    </Panel>
  </div>;
}

function DailyForm({ date, record, onClose }: { date: string; record?: Inspection; onClose: () => void }) {
  const { state, user, update, notify, syncStatus } = useDemo();
  const [base] = useState(() => record && structuredClone(record));
  const items = base?.daily?.items || dailyChecklist;
  const [mode, setMode] = useState<"check" | "na">(record?.daily?.mode || "check");
  const [results, setResults] = useState<Record<string, string>>(record?.results || {});
  return <form className="mt-5 space-y-5" onSubmit={event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const value: Inspection = { id: base?.id || uid(), at: base?.at || new Date().toISOString(), owner: state.role, inspector: base?.inspector || user.name, note: String(form.get("note") || ""), results: mode === "na" ? {} : results, daily: {
      date, mode, labName: String(form.get("labName") || "").trim(), template: base?.daily?.template || "daily-v1", items,
      itemNotes: mode === "na" ? {} : Object.fromEntries(items.map(item => [item.id, String(form.get(`note:${item.id}`) || "").trim()])),
      naReason: mode === "na" ? String(form.get("naReason") || "").trim() : "", due: String(form.get("due") || ""),
      inspectorId: base?.daily?.inspectorId, history: base?.daily?.history || [], confirmation: base?.daily?.confirmation, editReason: String(form.get("reason") || ""),
    } };
    try { validateDaily(value, !!base); } catch (error) { notify((error as Error).message, true); return; }
    if (update(s => {
      const existing = s.inspections.find(row => row.daily?.date === date);
      if (JSON.stringify(existing) !== JSON.stringify(base)) throw new Error("점검 기록이 변경되었습니다. 작성 창을 닫고 최신 내용을 확인해 주세요.");
      return { ...s, inspections: existing ? s.inspections.map(row => row.id === existing.id ? value : row) : [value, ...s.inspections] };
    }, "점검 내용을 반영했습니다.")) onClose();
  }}>
    <Field label="점검 연구실"><input className={inputClass} name="labName" required maxLength={120} defaultValue={base?.daily?.labName || state.lab?.name || ""} placeholder="소속 연구실 이름" /></Field>
    <Field label="점검 방식"><select className={inputClass} value={mode} onChange={e => setMode(e.target.value as "check" | "na")}><option value="check">항목별 점검</option><option value="na">일일 미해당 (N/A)</option></select></Field>
    {mode === "na" ? <Field label="일일 미해당 사유"><textarea className={inputClass} name="naReason" required maxLength={2000} defaultValue={base?.daily?.naReason} placeholder="해당 날짜에 점검이 해당하지 않는 이유를 기록하세요." /></Field> : <>
      {items.map((item, i) => <fieldset key={item.id} className="rounded-xl border border-gray-200 p-4"><legend className="px-1 text-sm font-semibold">{i + 1}. {item.title}</legend><p className="mb-3 text-xs text-gray-500">{item.group}</p><div className="flex flex-wrap gap-2">{dailyAnswers.map(answer => <label key={answer} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"><input type="radio" name={`result:${item.id}`} required value={answer} checked={results[item.id] === answer} onChange={() => setResults(s => ({ ...s, [item.id]: answer }))} />{dailyAnswerLabel[answer]}</label>)}</div><div className="mt-3"><Field label={`조치사항 ${i + 1}${results[item.id] === "부적합" ? " (필수)" : ""}`}><textarea name={`note:${item.id}`} className={inputClass} rows={2} required={results[item.id] === "부적합"} maxLength={2000} defaultValue={base?.daily?.itemNotes[item.id] || ""} placeholder="확인한 문제와 필요한 조치" /></Field></div></fieldset>)}
      {Object.values(results).includes("부적합") && <Field label="개선조치 기한"><input className={inputClass} type="date" name="due" required min={date} defaultValue={base?.daily?.due || koreaDate(new Date(Date.now() + 7 * 86400000))} /></Field>}
      <p className="text-xs leading-6 text-gray-500">새 불량 항목은 개선조치에 자동 등록됩니다. 점검 결과를 바꿔도 기존 개선조치는 자동 종결되지 않습니다.</p>
    </>}
    <Field label="점검 메모"><textarea className={inputClass} name="note" maxLength={2000} defaultValue={base?.note || ""} rows={2} /></Field>
    {base && <Field label="점검 정정 사유"><input className={inputClass} name="reason" required maxLength={2000} /></Field>}
    <Button type="submit" disabled={syncStatus !== "서버 저장 완료"}>점검 저장</Button>
  </form>;
}
