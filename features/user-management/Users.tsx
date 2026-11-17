"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Panel, Empty, Badge, Field, inputClass } from "@/components/ui/DemoUI";
import { accountRoles, type AccountRole } from "../local-auth/profile";
import { categories, recordFile, type ContentRecord } from "./records";
import { RecordEditor } from "./RecordEditor";
import { AdminActivity } from "./AdminActivity";
import { CategoryFilter, FileBrowser, RecordBrowser, type OwnedRecord, type OwnedFile } from "./RecordBrowser";
type UserRow = { id: string; name: string; email: string; role: AccountRole; active: number; count?: number; updatedAt?: string };
type Detail = { user: UserRow; lab?: { name: string; location: string; description: string }; note: string; revision: number; records: ContentRecord[]; files: { id: string; name: string; size: number }[];
  history: { id: string; kind: string; title: string; at: string; actor: string; reason: string; beforeValue: string; afterValue: string }[] };
async function api(url: string, input?: unknown) {
  const response = await fetch(url, input ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : { cache: "no-store" });
  const data = await response.json(); if (!response.ok) throw new Error(data.message); return data;
}
export function Users({ initialUser, initialCategory, initialRecord }: { initialUser?: string; initialCategory?: string; initialRecord?: string }) {
  const [users, setUsers] = useState<UserRow[]>([]), [query, setQuery] = useState(""), [role, setRole] = useState("");
  const [allRecords, setAllRecords] = useState<OwnedRecord[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null), [selected, setSelected] = useState(initialUser || "");
  const [files, setFiles] = useState<OwnedFile[]>([]);
  const [active, setActive] = useState("");
  const [category, setCategory] = useState(initialCategory || ""), [tab, setTab] = useState("users"), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false);
  const loadSequence = useRef(0);
  const reload = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true); setError("");
    try {
      const [users, records, detail, files] = await Promise.all([
        api("/api/account-data?view=users"), api("/api/account-data?view=records"), selected ? api(`/api/account-data?user=${encodeURIComponent(selected)}`) : null, api("/api/account-data?view=files"),
      ]);
      if (sequence !== loadSequence.current) return;
      setUsers(users); setAllRecords(records); setFiles(files); if (detail) setDetail(detail);
    } catch (error) { setError((error as Error).message); }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [selected]);
  useEffect(() => { setDetail(null); void reload(); }, [reload]);
  useEffect(() => { setCategory(initialCategory || ""); }, [initialCategory]);
  useEffect(() => { if (initialUser) { setSelected(initialUser); setTab("users"); } }, [initialUser]);
  useEffect(() => {
    if (detail?.user.id === initialUser && initialRecord) document.getElementById(`record-${initialRecord}`)?.scrollIntoView({ block: "center" });
  }, [detail?.user.id, initialUser, initialRecord]);
  async function save(input: unknown) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await api("/api/account-data", input); await reload(); setMessage("수정 내용과 이력을 저장했습니다."); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  const filtered = users.filter(user => (!role || user.role === role) && (!active || String(user.active) === active) && `${user.name} ${user.email} ${accountRoles[user.role]}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-6">
    <Panel><div className="mb-4 flex flex-wrap gap-3"><Link href="/management/menus" className="text-sm font-semibold text-brand-700 underline">전체 메뉴 관리 →</Link><span className="text-sm text-gray-500">사용자 {users.length}명 · 등록 자료 {allRecords.length}건 · 첨부 {files.length}개</span></div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-600">실제 가입 계정과 서버에 저장된 등록 자료를 확인합니다.</p><Button variant="outline" onClick={() => void reload()} disabled={loading}>사용자 새로고침</Button></div>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant={tab === "users" ? "primary" : "outline"} onClick={() => setTab("users")}>사용자·자료</Button><Button variant={tab === "records" ? "primary" : "outline"} onClick={() => setTab("records")}>전체 등록 자료</Button><Button variant={tab === "files" ? "primary" : "outline"} onClick={() => setTab("files")}>전체 첨부파일</Button><Button variant={tab === "activity" ? "primary" : "outline"} onClick={() => setTab("activity")}>등록·업로드 알림</Button></div></Panel>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-brand-700">{message}</p>}
    {tab === "activity" ? <AdminActivity /> : tab === "files" ? <Panel title="사용자별 업로드 첨부"><FileBrowser files={files} /></Panel> : tab === "records" ? <Panel title={`전체 사용자 등록 자료 · ${allRecords.length}건`}><RecordBrowser records={allRecords} /></Panel> : <>
      <Panel title={`사용자 검색 · ${filtered.length}명`}>
        <div className="grid gap-4 sm:grid-cols-3"><Field label="사용자 검색"><input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="이름, 이메일, 역할" /></Field>
          <Field label="역할 필터"><select className={inputClass} value={role} onChange={e => setRole(e.target.value)}><option value="">전체 역할</option>{Object.entries(accountRoles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="사용자 활성 상태"><select className={inputClass} value={active} onChange={e => setActive(e.target.value)}><option value="">전체 상태</option><option value="1">활성</option><option value="0">비활성</option></select></Field></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(user => <button disabled={busy} key={user.id} onClick={() => { setSelected(user.id); setCategory(""); setMessage(""); history.replaceState(null, "", `/management/users?user=${encodeURIComponent(user.id)}`); }} className={`min-w-0 rounded-xl border p-4 text-left ${selected === user.id ? "border-brand-600 bg-brand-50" : "border-gray-200"}`}>
          <strong>{user.name}</strong><p className="mt-1 break-all text-xs text-gray-500">{user.email}</p><p className="mt-2 text-xs">{accountRoles[user.role]} · {user.active ? "활성" : "비활성"}</p><p className="mt-2 text-xs text-brand-800">등록·수정 자료 {user.count || 0}건</p>
        </button>)}</div>{!filtered.length && <Empty>{loading ? "사용자를 불러오는 중입니다." : "조건에 맞는 사용자가 없습니다."}</Empty>}
      </Panel>
      {selected && !detail && loading && <p role="status">사용자 자료를 불러오는 중입니다.</p>}
      {detail && <>
        <Panel title={`${detail.user.name} · 계정 정보`}>
          {detail.lab && <div className="mb-5 rounded-lg bg-gray-50 p-4 text-sm"><strong>등록 연구실: {detail.lab.name}</strong><p className="mt-2">{detail.lab.location}</p><p className="mt-2 text-gray-500">{detail.lab.description}</p></div>}
          <form key={JSON.stringify(detail.user) + detail.note} className="space-y-4" onSubmit={e => { e.preventDefault(); const fields = new FormData(e.currentTarget); void save({ action: "profile", user: detail.user.id, original: detail.user, ...Object.fromEntries(fields), active: fields.get("active") === "true" }); }}>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="사용자 이름"><input name="name" required minLength={2} maxLength={40} className={inputClass} defaultValue={detail.user.name} /></Field><Field label="사용자 이메일"><input name="email" type="email" required className={inputClass} defaultValue={detail.user.email} /></Field>
              <Field label="사용자 역할"><select name="role" className={inputClass} defaultValue={detail.user.role}>{Object.entries(accountRoles).filter(([key]) => key !== "super_admin" || detail.user.role === "super_admin").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="계정 상태"><select name="active" className={inputClass} defaultValue={String(!!detail.user.active)}><option value="true">활성</option><option value="false">비활성</option></select></Field></div>
            <Field label="관리자 참조 메모"><textarea name="note" maxLength={10000} className={inputClass} rows={3} defaultValue={detail.note} placeholder="검토 시 참고할 내용을 기록하세요. 관리자에게만 표시됩니다." /></Field>
            <Field label="계정 수정 사유"><input name="reason" required maxLength={2000} className={inputClass} /></Field><Button type="submit" disabled={busy}>계정 정보 저장</Button>
          </form>
        </Panel>
        <div id="selected-records" className="scroll-mt-28"><Panel title={`등록·수정 자료 · ${detail.records.length}건`}><CategoryFilter records={detail.records} value={category} onChange={setCategory} /><div className="mt-4" /><Field label="자료 유형"><select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}><option value="">전체 자료</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
          <p className="my-4 text-xs leading-6 text-gray-500">초기 예제는 제외합니다. 사용자가 수정한 예제는 별도로 표시합니다. 관리자 정정은 사유와 수정 전후 이력을 남깁니다.</p>
          <div className="space-y-4">{detail.records.filter(row => !category || row.category === category).map(row => <details open={initialRecord === row.key && initialCategory === row.category ? true : undefined} id={`record-${row.key}`} key={`${row.category}:${row.key}:${detail.revision}`} className="rounded-xl border border-gray-200 p-4">
            <summary className="cursor-pointer break-words font-semibold"><span className="mr-2 text-xs text-brand-700">{categories[row.category]}</span>{row.title}{row.example && <span className="ml-2 text-xs font-normal text-gray-500">예제 수정</span>}</summary>
            <div className="mt-4 space-y-4">{recordFile(row) && <a className="block break-all text-sm text-brand-700 underline" href={`/api/account-files?user=${encodeURIComponent(detail.user.id)}&id=${encodeURIComponent(recordFile(row)!.id)}`}>연결 첨부 · {recordFile(row)!.name}</a>}<p className="break-all text-xs text-gray-500">자료 참조: {detail.user.id} / {row.category} / {row.key}</p>
              <RecordEditor row={row} busy={busy} onSave={(fields, reason) => void save({ action: "record", user: detail.user.id, revision: detail.revision, original: row.data, category: row.category, key: row.key, fields, reason })} />
            </div></details>)}{!detail.records.filter(row => !category || row.category === category).length && <Empty>아직 등록한 자료가 없습니다. 기존 브라우저 자료는 해당 사용자가 접속하면 동기화됩니다.</Empty>}</div>
        </Panel></div>
        <Panel title={`업로드 첨부 · ${detail.files.length}개`}><div className="space-y-3">{detail.files.map(file => <a key={file.id} className="block break-all rounded-lg border border-gray-200 p-3 text-sm text-brand-800" href={`/api/account-files?user=${encodeURIComponent(detail.user.id)}&id=${encodeURIComponent(file.id)}`}>{file.name} · {(file.size / 1024).toFixed(1)}KB · 원본 다운로드</a>)}{!detail.files.length && <Empty>서버에 저장된 첨부가 없습니다.</Empty>}</div></Panel>
        <Panel title="등록·수정 이력"><div className="space-y-4">{detail.history.map(row => <details key={row.id} className="rounded-lg border border-gray-200 p-4"><summary className="cursor-pointer break-words text-sm"><Badge>{row.kind}</Badge> {row.title} · {row.actor} · {new Date(row.at).toLocaleString("ko-KR")}</summary><p className="mt-3 text-sm">{row.reason || "사용자 등록·저장"}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{[row.beforeValue, row.afterValue].map((value, index) => <div key={index}><strong className="text-xs">{index ? "변경 후" : "변경 전"}</strong><pre className="mt-2 whitespace-pre-wrap break-all bg-gray-50 p-3 text-xs">{JSON.stringify(JSON.parse(value || "null"), null, 2)}</pre></div>)}</div></details>)}</div></Panel>
      </>}
    </>}
  </div>;
}
