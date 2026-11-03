import Link from "next/link";
import { cn } from "@/lib/utils";

// 페이지 번호 링크. 현재 쿼리(검색어 등)는 params 로 넘기면 유지된다.
export function Pagination({
  basePath,
  page,
  totalPages,
  params = {},
}: {
  basePath: string;
  page: number;
  totalPages: number;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  // 현재 페이지 주변 최대 5개
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  const linkClass = "flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm";

  return (
    <nav aria-label="페이지 이동" className="mt-6 flex justify-center">
      <ul className="flex items-center gap-1">
        {page > 1 && (
          <li>
            <Link href={href(page - 1)} className={cn(linkClass, "text-gray-600 hover:bg-gray-100")}>이전</Link>
          </li>
        )}
        {pages.map((p) => (
          <li key={p}>
            <Link
              href={href(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(linkClass, p === page ? "bg-brand-700 font-semibold text-white" : "text-gray-600 hover:bg-gray-100")}
            >
              {p}
            </Link>
          </li>
        ))}
        {page < totalPages && (
          <li>
            <Link href={href(page + 1)} className={cn(linkClass, "text-gray-600 hover:bg-gray-100")}>다음</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
