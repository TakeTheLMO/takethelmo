import type { Metadata } from "next";
import { SectionLayout } from "@/components/layout/SectionLayout";
import { LoginRequired } from "@/components/ui/LoginRequired";
import { Pagination } from "@/components/ui/Pagination";
import { findNavContext } from "@/config/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { parsePage } from "@/lib/format";
import { listPublishedNotices } from "@/features/notices/queries";
import { NoticeList } from "@/features/notices/components/NoticeList";
import { NoticeSearch } from "@/features/notices/components/NoticeSearch";

const PATH = "/community/notices";
export const metadata: Metadata = { title: "공지사항" };

type Props = { searchParams: Promise<{ page?: string | string[]; q?: string | string[] }> };

export default async function NoticesPage({ searchParams }: Props) {
  const ctx = findNavContext(PATH)!;
  const sp = await searchParams;
  const user = await getSessionUser(); // D-08 결정 전까지 로그인 필요 (비로그인은 안내 카드)

  let content: React.ReactNode;
  if (!user) {
    content = <LoginRequired next={PATH} message="공지사항은 로그인한 기관 구성원만 볼 수 있습니다." />;
  } else {
    const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() || undefined;
    const page = parsePage(sp.page);
    const result = await listPublishedNotices({ page, q });
    content = (
      <>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <NoticeSearch q={q} />
          <p className="mb-4 text-sm text-gray-500">총 {result.total.toLocaleString("ko-KR")}건</p>
        </div>
        <NoticeList rows={result.rows} total={result.total} page={page} searched={!!q} />
        <Pagination basePath={PATH} page={page} totalPages={result.totalPages} params={{ q }} />
      </>
    );
  }

  return (
    <SectionLayout group={ctx.group} currentHref={PATH} title={ctx.item!.label} description="기관 안전관리 공지를 확인합니다.">
      {content}
    </SectionLayout>
  );
}
