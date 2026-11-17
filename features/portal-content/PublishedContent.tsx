import Link from "next/link";
import { Panel, Badge } from "@/components/ui/DemoUI";
import type { MenuDocument } from "./model";
export function PublishedContent({ document, admin = false, showPosts = true }: { document: MenuDocument; admin?: boolean; showPosts?: boolean }) {
  return <div className="space-y-4">
    {admin && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm"><span>관리자 · 이 메뉴의 사용자 자료와 공통 내용을 관리할 수 있습니다.</span><Link href={`/management/menus?path=${encodeURIComponent(document.path)}`} className="font-semibold text-brand-800 underline">이 메뉴 관리 →</Link></div>}
    {document.page.body && <Panel title="이용 안내"><p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">{document.page.body}</p></Panel>}
    {showPosts && document.posts.map(post => <article id={`post-${post.id}`} key={post.id} className="scroll-mt-28 rounded-xl border border-gray-200 bg-white p-5 sm:p-6"><Badge>{post.type}</Badge><h2 className="mt-3 text-lg font-semibold">{post.title}</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">{post.body}</p>{post.sourceUrl && <a className="mt-4 block break-all text-sm text-brand-700 underline" href={post.sourceUrl} target="_blank" rel="noreferrer">참고 링크 열기 ↗</a>}{post.files.map(file => <a key={file.id} className="mt-3 block break-all text-sm text-brand-700 underline" href={`/api/portal-content/files?id=${file.id}`}>첨부 다운로드 · {file.name}</a>)}</article>)}
  </div>;
}
