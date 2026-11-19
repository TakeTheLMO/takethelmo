"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, Empty, Field, inputClass } from "@/components/ui/DemoUI";
import { categories, recordFile, recordHref, type ContentRecord } from "./records";
export type OwnedRecord = ContentRecord & { userId: string; userName: string; email: string; updatedAt: string };
export type OwnedFile = { id: string; name: string; size: number; userId: string; userName: string; email: string; records: Pick<ContentRecord, "category" | "key" | "title">[] };
export function CategoryFilter({ records, value, onChange }: { records: ContentRecord[]; value: string; onChange: (value: string) => void }) {
  return <div className="flex flex-wrap gap-2" aria-label="카테고리별 자료 수">{[["", "전체"], ...Object.entries(categories)].map(([key, label]) => <button type="button" key={key} aria-pressed={value === key} onClick={() => onChange(key)} className={`rounded-full border px-3 py-2 text-xs ${value === key ? "border-brand-700 bg-brand-700 text-white" : "border-gray-200 bg-white text-gray-600"}`}>{label} <strong>{records.filter(row => !key || row.category === key).length}</strong></button>)}</div>;
}
export function RecordBrowser({ records, initialCategory = "" }: { records: OwnedRecord[]; initialCategory?: string }) {
  const [query, setQuery] = useState(""), [category, setCategory] = useState(initialCategory), [owner, setOwner] = useState(""), [status, setStatus] = useState(""), [attachment, setAttachment] = useState(false);
  const users = [...new Map(records.map(row => [row.userId, row.userName])).entries()];
  const scope = records.filter(row => !owner || row.userId === owner);
  const filtered = scope.filter(row => (!category || row.category === category) && (!status || row.data.status === status) && (!attachment || recordFile(row)) && `${row.userName} ${row.email} ${row.title} ${JSON.stringify(row.data)}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-4">
    <CategoryFilter records={scope} value={category} onChange={value => { setCategory(value); setStatus(""); }} />
    <div className="grid gap-3 sm:grid-cols-2"><Field label="사용자 등록 자료 검색"><input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="사용자, 제목, 내용" /></Field><Field label="등록 사용자"><select className={inputClass} value={owner} onChange={e => setOwner(e.target.value)}><option value="">전체 사용자</option>{users.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
      <Field label="처리 상태"><select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}><option value="">전체 상태</option>{[...new Set(scope.filter(row => !category || row.category === category).map(row => row.data.status).filter(Boolean))].map(value => <option key={String(value)}>{String(value)}</option>)}</select></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={attachment} onChange={e => setAttachment(e.target.checked)} />첨부가 있는 자료만</label></div>
    <p className="text-sm text-gray-500" role="status">조건에 맞는 자료 {filtered.length}건</p>
    {filtered.map(row => <Link key={`${row.userId}:${row.category}:${row.key}`} className="block rounded-xl border border-gray-200 p-4 hover:border-brand-600" href={recordHref(row.userId, row)}><div className="flex flex-wrap gap-2"><Badge>{categories[row.category]}</Badge>{row.data.status ? <Badge>{String(row.data.status)}</Badge> : null}{recordFile(row) && <Badge>첨부 {recordFile(row)!.name}</Badge>}</div><strong className="mt-3 block break-words">{row.title}</strong><p className="mt-2 break-all text-xs text-gray-500">{row.userName} · {row.email}</p><span className="mt-3 inline-block text-xs text-brand-700">내용 확인·수정 →</span></Link>)}
    {!filtered.length && <Empty>조건에 맞는 등록 자료가 없습니다.</Empty>}
  </div>;
}
export function FileBrowser({ files }: { files: OwnedFile[] }) {
  const [query, setQuery] = useState(""), [category, setCategory] = useState("");
  const rows = files.filter(file => `${file.name} ${file.userName} ${file.email}`.toLowerCase().includes(query.toLowerCase()) && (!category || (category === "unlinked" ? !file.records.length : file.records.some(record => record.category === category))));
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="첨부 검색"><input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="파일명, 사용자" /></Field><Field label="첨부 카테고리"><select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}><option value="">전체 첨부</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="unlinked">연결 자료 없음</option></select></Field></div><p className="text-sm text-gray-500">첨부 {rows.length}개</p>
    {rows.map(file => <article key={`${file.userId}:${file.id}`} className="space-y-3 rounded-lg border border-gray-200 p-4"><a className="block break-all font-medium text-brand-800" href={`/api/account-files?user=${encodeURIComponent(file.userId)}&id=${encodeURIComponent(file.id)}`}>{file.name} · {(file.size / 1024).toFixed(1)}KB · 원본 다운로드</a><p className="text-xs text-gray-500">{file.userName}</p>{file.records.map(record => <Link key={`${record.category}:${record.key}`} href={recordHref(file.userId, record)} className="block break-words text-sm text-brand-700">{categories[record.category]} · {record.title} →</Link>)}{!file.records.length && <p className="text-xs text-gray-500">업로드된 원본 · 연결된 업무 자료 없음</p>}</article>)}{!rows.length && <Empty>조건에 맞는 첨부가 없습니다.</Empty>}
  </div>;
}
