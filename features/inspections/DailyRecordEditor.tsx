"use client";
import { Button } from "@/components/ui/Button";
import { Field, inputClass, Timeline } from "@/components/ui/DemoUI";
import type { Inspection } from "../demo/model";
import { dailyAnswerLabel, dailyAnswers, inspectionStatus } from "./daily";

export function DailyRecordEditor({ record, busy, onSave }: { record: Inspection; busy: boolean; onSave: (fields: Record<string, unknown>, reason: string) => void }) {
  const daily = record.daily!;
  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const results = daily.mode === "na" ? {} : Object.fromEntries(daily.items.map(item => [item.id, String(form.get(`result:${item.id}`))]));
    const itemNotes = daily.mode === "na" ? {} : Object.fromEntries(daily.items.map(item => [item.id, String(form.get(`note:${item.id}`) || "")]));
    const values = { results, note: String(form.get("note") || ""), dailyNotes: itemNotes, labName: String(form.get("labName") || ""), naReason: daily.mode === "na" ? String(form.get("naReason") || "") : daily.naReason, inspectionDue: String(form.get("due") || "") };
    const original = { results: record.results, note: record.note, dailyNotes: daily.itemNotes, labName: daily.labName, naReason: daily.naReason, inspectionDue: daily.due };
    const fields: Record<string, unknown> = Object.fromEntries(Object.entries(values).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key as keyof typeof original])));
    if (((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "confirm") fields.confirm = true;
    onSave(fields, String(form.get("reason") || ""));
  }}><fieldset disabled={busy} className="space-y-4">
    <p className="text-sm font-medium">{daily.date} · {record.inspector || "기록자 미기재"} · {inspectionStatus(record)}</p>
    <p className="text-xs leading-6 text-gray-500">포털 관리자 확인은 기관 책임자의 승인·전자서명을 대신하지 않습니다. 불량 항목의 개선조치 종결과는 별개입니다. 정정하면 이전 확인이 해제되며, 다시 확인해야 합니다.</p>
    {daily.confirmation && <p className="rounded-lg bg-gray-50 p-3 text-sm">확인: {daily.confirmation.actor} · {daily.confirmation.note}</p>}
    <Field label="자료 연구실"><input className={inputClass} name="labName" required maxLength={120} defaultValue={daily.labName} /></Field>
    {daily.mode === "na" ? <Field label="자료 미해당 사유"><textarea className={inputClass} name="naReason" required maxLength={2000} defaultValue={daily.naReason} /></Field> : <>{daily.items.map((item, i) => <div className="rounded-lg border border-gray-200 p-3" key={item.id}><Field label={item.title}><select name={`result:${item.id}`} className={inputClass} defaultValue={record.results[item.id]}>{dailyAnswers.map(value => <option key={value} value={value}>{dailyAnswerLabel[value]}</option>)}</select></Field><div className="mt-2"><Field label={`자료 조치사항 ${i + 1}`}><textarea className={inputClass} name={`note:${item.id}`} rows={2} maxLength={2000} defaultValue={daily.itemNotes[item.id] || ""} /></Field></div></div>)}<Field label="자료 개선조치 기한"><input className={inputClass} type="date" name="due" min={daily.date} defaultValue={daily.due} /></Field></>}
    <Field label="자료 점검 메모"><textarea className={inputClass} name="note" maxLength={2000} defaultValue={record.note} /></Field>
    <details><summary className="cursor-pointer text-sm text-brand-700">점검·확인 이력 ({daily.history.length})</summary><div className="mt-3"><Timeline items={daily.history} /></div></details>
    <Field label="자료 수정 사유"><input name="reason" required maxLength={2000} className={inputClass} placeholder="정정 사유 또는 확인 의견" /></Field>
    <div className="flex flex-wrap gap-2"><Button type="submit">자료 수정 저장</Button>{!daily.confirmation && <Button type="submit" value="confirm" variant="outline">포털 관리자 확인</Button>}</div>
  </fieldset></form>;
}
