import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Container } from "@/components/ui/Container";

export type Crumb = { label: string; href?: string };

// 모든 하위 페이지 상단에 쓰는 공통 제목 영역 (경로 표시 + 제목 + 설명 + 우측 액션).
export function PageHeader({
  title,
  description,
  crumbs = [],
  actions,
}: {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <Container className="py-8">
        <nav aria-label="현재 위치" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
            <li>
              <Link href="/" className="flex items-center hover:text-brand-700" aria-label="홈">
                <Home className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
            {crumbs.map((c) => (
              <li key={c.label} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" aria-hidden />
                {c.href ? (
                  <Link href={c.href} className="hover:text-brand-700">{c.label}</Link>
                ) : (
                  <span aria-current="page" className="text-gray-700">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
            {description && <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      </Container>
    </div>
  );
}
