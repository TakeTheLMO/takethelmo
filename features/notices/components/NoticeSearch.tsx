import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

// 서버 렌더링 GET 폼: /community/notices?q=키워드 (검색하면 1페이지부터)
export function NoticeSearch({ q }: { q?: string }) {
  return (
    <form action="/community/notices" method="get" role="search" className="mb-4 flex gap-2">
      <label htmlFor="notice-q" className="sr-only">제목 검색</label>
      <input
        id="notice-q"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={100}
        placeholder="제목으로 검색"
        className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600"
      />
      <Button type="submit" variant="outline">
        <Search className="h-4 w-4" aria-hidden />
        검색
      </Button>
    </form>
  );
}
