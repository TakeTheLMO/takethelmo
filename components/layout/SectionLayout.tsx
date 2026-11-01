import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "./PageHeader";
import type { NavGroup } from "@/config/navigation";
import { cn } from "@/lib/utils";

// 메뉴 그룹(안전관리, 연구실 관리 ...)에 속한 페이지의 공통 틀:
// 상단 PageHeader + 왼쪽 섹션 메뉴(같은 그룹의 하위 메뉴) + 본문.
// 실제 기능 페이지도 이 컴포넌트로 감싸면 디자인이 자동으로 통일된다.
export function SectionLayout({
  group,
  currentHref,
  title,
  description,
  actions,
  children,
}: {
  group: NavGroup;
  currentHref: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        crumbs={[{ label: group.label, href: group.items[0]?.href ?? group.href }, { label: title }]}
        actions={actions}
      />
      <Container className="grid gap-8 py-8 lg:grid-cols-[14rem_1fr]">
        <aside>
          <nav aria-label={`${group.label} 메뉴`} className="lg:sticky lg:top-24">
            <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 lg:block">{group.label}</p>
            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {group.items.map((item) => {
                const active = item.href === currentHref;
                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block whitespace-nowrap rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-gray-600 hover:bg-white hover:text-brand-800 lg:whitespace-normal",
                        active && "border-brand-700 bg-white font-semibold text-brand-800 shadow-sm",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </Container>
    </>
  );
}
