"use client";
import { useState } from "react";
import { Field, inputClass, Timeline } from "@/components/ui/DemoUI";
import { Button } from "@/components/ui/Button";
import { InquiryFields } from "../demo/InquiryForm";
import type { History, InquiryDetails, Inspection } from "../demo/model";
import { DailyRecordEditor } from "../inspections/DailyRecordEditor";
import { choiceFields, editFields, fieldsFor, nestedFields, reviewSteps, type ContentRecord } from "./records";
const quantities = ["quantity", "received", "used", "stored"];
export function RecordEditor({ row, busy, onSave }: { row: ContentRecord; busy: boolean; onSave: (fields: Record<string, unknown>, reason: string) => void }) {
  const [inquiry, setInquiry] = useState(row.data.inquiry as InquiryDetails | undefined);
  const keys = fieldsFor(row).filter(key => !(inquiry && key === "body"));
  if (row.category === "inspections" && row.data.daily) return <DailyRecordEditor record={row.data as Inspection} busy={busy} onSave={onSave} />;
  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault(); const form = new FormData(event.currentTarget), fields: Record<string, unknown> = {};
    for (const key of keys) {
      if (key === "results" || key === "answers") fields[key] = Object.fromEntries(Object.keys(nestedFields[key]).map(id => [id, String(form.get(`${key}:${id}`) || "")]).filter(([, value]) => value));
      else if (key === "active") fields[key] = form.get(key) === "true";
      else if (quantities.includes(key)) fields[key] = form.get(key) === "" ? null : Number(form.get(key));
      else fields[key] = String(form.get(key) || "");
    }
    if (inquiry) fields.inquiry = inquiry;
    const status = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
    if (status) fields.status = status;
    onSave(fields, String(form.get("reason") || ""));
  }}><fieldset disabled={busy} className="space-y-4">
    {row.data.status ? <p className="text-sm font-medium">현재 상태: {String(row.data.status)}</p> : null}
    {keys.map(key => {
      const value = row.data[key];
      if (key === "results" || key === "answers") return <div key={key} className="grid gap-3 sm:grid-cols-2">{Object.entries(nestedFields[key]).map(([id, label]) => <Field key={id} label={label}><select name={`${key}:${id}`} className={inputClass} defaultValue={(value as Record<string, string>)?.[id] || ""}><option value="">미응답</option>{(key === "results" ? ["적합", "부적합", "해당 없음"] : ["예", "아니요", "모르겠어요"]).map(answer => <option key={answer}>{answer}</option>)}</select></Field>)}</div>;
      const options = key === "active" ? ["true", "false"] : key === "unit" && row.data.format !== "lmo" ? undefined : choiceFields[key];
      return <Field key={key} label={`자료 ${editFields[key]}`}>{options ? <select name={key} className={inputClass} defaultValue={String(value)}>{!options.includes(String(value)) && <option>{String(value)}</option>}{options.map(option => <option key={option} value={option}>{key === "active" ? option === "true" ? "활동" : "비활동" : option}</option>)}</select>
        : quantities.includes(key) ? <input type="number" min="0" step="any" name={key} className={inputClass} defaultValue={value === null ? "" : String(value)} required={key === "quantity"} />
        : ["due", "completedAt", "recordedDate"].includes(key) ? <input type="date" name={key} className={inputClass} defaultValue={String(value || "").slice(0, 10)} />
        : <textarea name={key} className={inputClass} defaultValue={String(value ?? "")} rows={["body", "note", "notes", "description"].includes(key) ? 4 : 1} required={["title", "name", "label", "body", "place"].includes(key)} maxLength={20000} />}</Field>;
    })}
    {inquiry && <InquiryFields value={inquiry} onChange={setInquiry} />}
    {row.category === "assessment" && <p className="text-xs text-gray-500">현재 확인 응답을 정정합니다. 이미 제출된 문의에 연결된 응답 사본은 해당 문의에서 확인하세요.</p>}
    {Array.isArray(row.data.history) && <Timeline items={row.data.history as History[]} />}
    <details><summary className="cursor-pointer text-xs text-gray-500">등록 내용 전체 보기</summary><pre className="mt-3 whitespace-pre-wrap break-all rounded-lg bg-gray-50 p-3 text-xs leading-6">{JSON.stringify(row.data, null, 2)}</pre></details>
    <Field label="자료 수정 사유"><input name="reason" required maxLength={2000} className={inputClass} placeholder="처리 의견, 답변 또는 수정 사유를 입력하세요." /></Field>
    <div className="flex flex-wrap gap-2"><Button type="submit" value="">자료 수정 저장</Button>{reviewSteps(row.category, row.data.status).map(status => <Button type="submit" variant="outline" key={status} value={status}>{status === "검토 중" ? "검토 시작" : status === "답변 준비 중" ? "답변 준비 시작" : status}</Button>)}</div>
  </fieldset></form>;
}
