"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, Empty, Field, inputClass, Panel } from "@/components/ui/DemoUI";
import { RecordBrowser, FileBrowser, type OwnedFile, type OwnedRecord } from "../user-management/RecordBrowser";
import { belongsToMenu, managedMenus, postTypes, type ContentHistory, type MenuDocument, type SharedPost } from "./model";
type Detail = MenuDocument & { history: ContentHistory[] };
async function api(url: string, input?: unknown) {
  const response = await fetch(url, input ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : { cache: "no-store" });
  const data = await response.json(); if (!response.ok) throw new Error(data.message); return data;
}
export function MenuManager({ initialPath = "/portal" }: { initialPath?: string }) {
  const [path, setPath] = useState(managedMenus.some(menu => menu.href === initialPath) ? initialPath : "/portal"), [query, setQuery] = useState("");
  const [data, setData] = useState<Detail | null>(null), [records, setRecords] = useState<OwnedRecord[]>([]), [files, setFiles] = useState<OwnedFile[]>([]);
  const [tab, setTab] = useState("content"), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [dirty, setDirty] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState(""), [reason, setReason] = useState("");
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++sequence.current; setLoading(true); setError("");
    try {
      const [doc, rows, uploads] = await Promise.all([api(`/api/portal-content?path=${encodeURIComponent(path)}`), api("/api/account-data?view=records"), api("/api/account-data?view=files")]);
      if (sequence.current !== seq) return;
      setData(doc); setRecords(rows); setFiles(uploads); setDirty(false); setReason("");
    } catch (e) { if (seq === sequence.current) setError((e as Error).message); }
    finally { if (seq === sequence.current) setLoading(false); }
  }, [path]);
  useEffect(() => { setData(null); void load(); }, [load]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const menu = managedMenus.find(menu => menu.href === path)!;
  const relevant = records.filter(record => belongsToMenu(path, record));
  const uploads = files.filter(file => file.records.some(record => relevant.some(row => row.userId === file.userId && row.category === record.category && row.key === record.key)));
  function selectMenu(nextPath: string) {
    if (dirty && !confirm("저장하지 않은 변경을 버리고 다른 메뉴를 여시겠습니까?")) return;
    setPath(nextPath); setMessage(""); history.replaceState(null, "", `/management/menus?path=${encodeURIComponent(nextPath)}`);
  }
  function edit(patch: Partial<Detail>) { setData(old => old ? { ...old, ...patch } : old); setDirty(true); setMessage(""); }
  function editPost(id: string, patch: Partial<SharedPost>) { if (data) edit({ posts: data.posts.map(post => post.id === id ? { ...post, ...patch } : post) }); }
  async function save() {
    if (!data || busy) return; setBusy(true); setError(""); setMessage("");
    try { const result = await api("/api/portal-content", { ...data, reason }); setData(result); setDirty(false); setReason(""); setMessage("저장했습니다. 게시 중인 내용은 해당 메뉴에 반영됩니다."); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function upload(id: string, file: File) {
    setBusy(true); setError("");
    try { const form = new FormData(); form.set("file", file); const response = await fetch("/api/portal-content/files", { method: "POST", body: form }), result = await response.json(); if (!response.ok) throw new Error(result.message); const post = data?.posts.find(post => post.id === id); if (post) editPost(id, { files: [...post.files, result] }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <Panel title="전체 메뉴 관리"><p className="text-sm leading-6 text-gray-600">메뉴별 사용자 업무 자료를 확인하고, 페이지 안내와 공통 자료를 관리합니다. 공통 자료는 게시 상태로 저장하면 사용자에게 표시됩니다.</p><Link href="/management/users" className="mt-3 inline-block text-sm text-brand-700 underline">사용자별 관리로 이동</Link></Panel>
    <div className="rounded-xl border border-gray-200 bg-white p-4 xl:hidden"><Field label="관리 메뉴 선택"><select className={inputClass} value={path} disabled={busy || loading} onChange={event => selectMenu(event.target.value)}>{[...new Set(managedMenus.map(menu => menu.group))].map(group => <optgroup key={group} label={group}>{managedMenus.filter(menu => menu.group === group).map(menu => <option value={menu.href} key={menu.href}>{menu.label}</option>)}</optgroup>)}</select></Field></div>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4 xl:block"><Field label="관리 메뉴 검색"><input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="메뉴 이름" /></Field><div className="mt-4 max-h-[65vh] space-y-4 overflow-y-auto">{[...new Set(managedMenus.map(menu => menu.group))].map(group => <div key={group}><h2 className="mb-2 text-xs font-semibold text-gray-500">{group}</h2>{managedMenus.filter(menu => menu.group === group && `${menu.label} ${group}`.includes(query)).map(item => <button key={item.href} type="button" disabled={busy || loading} aria-current={path === item.href ? "page" : undefined} onClick={() => { selectMenu(item.href); }} className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm ${path === item.href ? "bg-brand-700 text-white" : "hover:bg-gray-100"}`}>{item.label}</button>)}</div>)}</div></aside>
      <div className="min-w-0 space-y-5">
        <Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-gray-500">{menu.group}</p><h2 className="mt-1 text-lg font-semibold">{menu.label}</h2></div><a target="_blank" rel="noreferrer" href={path} className="text-sm text-brand-700 underline">실제 페이지 보기 ↗</a></div><div className="mt-5 flex flex-wrap gap-2">{[["content", "안내·공통 자료"], ["records", `사용자 업무 자료 ${relevant.length}`], ["files", `관련 첨부 ${uploads.length}`], ["history", "수정 이력"]].map(([value, label]) => <Button key={value} variant={tab === value ? "primary" : "outline"} onClick={() => setTab(value)}>{label}</Button>)}</div></Panel>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" className="underline" onClick={() => { if (!dirty || confirm("작성 내용을 버리고 최신 내용을 불러오시겠습니까?")) void load(); }}>최신 내용 불러오기</button></p>}{message && <p role="status" className="text-sm text-brand-700">{message}</p>}
        {loading ? <p role="status">메뉴 자료를 불러오는 중입니다.</p> : data && <>
          {tab === "records" && <Panel title="사용자 업무 자료"><RecordBrowser key={path} records={relevant} /></Panel>}
          {tab === "files" && <Panel title="관련 업무 첨부"><FileBrowser key={path} files={uploads} /></Panel>}
          {tab === "history" && <Panel title="페이지·공통 자료 변경 이력">{data.history.map(entry => <details key={entry.id} className="mb-3 rounded-lg border border-gray-200 p-4"><summary className="cursor-pointer text-sm">{new Date(entry.at).toLocaleString("ko-KR")} · {entry.actor} · {entry.reason}</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">{[entry.beforeValue, entry.afterValue].map((value, i) => <div key={i}><strong className="text-xs">{i ? "변경 후" : "변경 전"}</strong><pre className="mt-2 whitespace-pre-wrap break-all bg-gray-50 p-3 text-xs">{JSON.stringify(JSON.parse(value), null, 2)}</pre></div>)}</div></details>)}{!data.history.length && <Empty>아직 변경 이력이 없습니다.</Empty>}</Panel>}
          {tab === "content" && <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-5"><fieldset disabled={busy} className="space-y-5">
            <Panel title="페이지 안내"><div className="space-y-4"><Field label="페이지 제목"><input className={inputClass} maxLength={160} required value={data.page.title} onChange={e => edit({ page: { ...data.page, title: e.target.value } })} /></Field><Field label="페이지 설명"><textarea className={inputClass} maxLength={1000} rows={2} value={data.page.description} onChange={e => edit({ page: { ...data.page, description: e.target.value } })} /></Field><Field label="페이지 안내 본문"><textarea className={inputClass} maxLength={20000} rows={5} value={data.page.body} onChange={e => edit({ page: { ...data.page, body: e.target.value } })} placeholder="메뉴별 이용 방법, 담당자 안내 등을 입력하세요." /></Field><p className="text-xs text-gray-500">제목·설명·본문은 저장 즉시 해당 페이지에 표시됩니다. 기존 업무 기능과 메뉴 주소는 유지됩니다.</p></div></Panel>
            <Panel title={`공통 자료 · ${data.posts.length}건`}><Button type="button" variant="outline" onClick={() => edit({ posts: [...data.posts, { id: crypto.randomUUID(), title: "", body: "", type: "안내", status: "draft", sourceUrl: "", files: [] }] })}>+ 공통 자료 추가</Button><div className="mt-5 space-y-4">{data.posts.map((post, index) => <details key={post.id} open className="rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer break-words font-medium"><Badge>{post.status === "published" ? "게시 중" : post.status === "archived" ? "보관" : "작성 중"}</Badge> {post.title || `새 공통 자료 ${index + 1}`}</summary><div className="mt-4 space-y-4"><Field label="공통 자료 제목"><input required className={inputClass} maxLength={200} value={post.title} onChange={e => editPost(post.id, { title: e.target.value })} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="공통 자료 분류"><select className={inputClass} value={post.type} onChange={e => editPost(post.id, { type: e.target.value })}>{postTypes.map(type => <option key={type}>{type}</option>)}</select></Field><Field label="공개 상태"><select className={inputClass} value={post.status} onChange={e => editPost(post.id, { status: e.target.value as SharedPost["status"] })}><option value="draft">작성 중 · 관리자만</option><option value="published">게시 · 사용자에게 표시</option><option value="archived">보관 · 게시 중단</option></select></Field></div><Field label="공통 자료 내용"><textarea className={inputClass} maxLength={20000} rows={6} value={post.body} onChange={e => editPost(post.id, { body: e.target.value })} /></Field><Field label="참고·동영상 링크"><input type="url" className={inputClass} maxLength={2000} value={post.sourceUrl} onChange={e => editPost(post.id, { sourceUrl: e.target.value })} placeholder="https://" /></Field>
              <Field label="공통 자료 첨부"><input type="file" accept=".pdf,.png,.jpg,.jpeg" className={inputClass} disabled={busy || post.files.length >= 10} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(post.id, file); }} /></Field><p className="text-xs text-gray-500">PDF·PNG·JPG, 파일당 5MB 이하 · 최대 10개</p>{post.files.map(file => <div key={file.id} className="flex flex-wrap items-center gap-3 text-sm"><a className="break-all text-brand-700 underline" href={`/api/portal-content/files?id=${file.id}`}>{file.name}</a><button type="button" className="text-xs underline" onClick={() => editPost(post.id, { files: post.files.filter(row => row.id !== file.id) })}>첨부 연결 해제</button></div>)}</div></details>)}{!data.posts.length && <Empty>이 메뉴에 등록한 공통 자료가 없습니다.</Empty>}</div></Panel>
            <Panel><Field label="메뉴 수정 사유"><input required maxLength={2000} className={inputClass} value={reason} onChange={e => setReason(e.target.value)} /></Field><div className="mt-4 flex flex-wrap items-center gap-3"><Button type="submit" disabled={busy || !dirty}>{busy ? "저장 중" : "메뉴 내용 저장"}</Button><span className="text-xs text-gray-500">{dirty ? "저장하지 않은 변경이 있습니다." : "저장된 내용을 보고 있습니다."}</span></div></Panel>
          </fieldset></form>}
        </>}
      </div>
    </div>
  </div>;
}
