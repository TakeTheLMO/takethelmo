"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AdminNavItem } from "@/config/admin-navigation";

// 메뉴 목록은 서버에서 역할별로 걸러 전달한다. 클라이언트는 표시만 담당.
export function AdminSidebar({ items }: { items: Pick<AdminNavItem, "label" | "href">[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴" className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:p-3">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800",
              active && "bg-brand-50 font-semibold text-brand-800",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
