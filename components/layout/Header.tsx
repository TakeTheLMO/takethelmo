"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogIn, Menu, ShieldCheck, UserCircle, X } from "lucide-react";
import { Logo } from "./Logo";
import { Container } from "@/components/ui/Container";
import { isPathActive, navigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

export type HeaderUser = { email: string | null; roleLabel: string } | null;

export function Header({ user, showAdminLink = false }: { user: HeaderUser; showAdminLink?: boolean }) {
  const pathname = usePathname();
  // 모바일 메뉴는 "열린 경로"를 기억한다. 페이지가 바뀌면 자동으로 닫힌다 (effect 불필요).
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const close = () => setOpenOn(null);

  return (
    <header
      className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85"
      onKeyDown={(e) => e.key === "Escape" && close()}
    >
      <Container className="flex h-16 items-center gap-6">
        <Logo />

        {/* Desktop navigation */}
        <nav className="hidden flex-1 justify-center lg:flex" aria-label="주 메뉴">
          <ul className="flex items-center gap-0.5">
            {navigation.map((group) => {
              const active = isPathActive(pathname, group.href);
              return (
                <li key={group.href} className="group relative">
                  <Link
                    href={group.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-3 py-2 text-[15px] font-medium text-gray-700 transition-colors hover:text-brand-700",
                      active && "text-brand-800",
                    )}
                  >
                    {group.label}
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition-transform group-hover:rotate-180" aria-hidden />
                  </Link>
                  {/* 활성 메뉴 밑줄 */}
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand-700 transition-opacity",
                      active ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <div className="invisible absolute left-1/2 top-full w-64 -translate-x-1/2 pt-3 opacity-0 transition duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={pathname === item.href ? "page" : undefined}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800",
                              pathname === item.href && "bg-brand-50 font-semibold text-brand-800",
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {user ? (
            <>
              {showAdminLink && (
                <Link
                  href="/admin"
                  className="hidden items-center gap-1.5 rounded-md border border-brand-700 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 sm:flex"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  관리자
                </Link>
              )}
              <span className="hidden items-center gap-1.5 text-sm text-gray-700 xl:flex" title={user.email ?? undefined}>
                <UserCircle className="h-5 w-5 text-gray-400" aria-hidden />
                <span className="max-w-40 truncate">{user.email}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{user.roleLabel}</span>
              </span>
              <form action="/auth/signout" method="post" className="hidden sm:block">
                <button type="submit" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              로그인
            </Link>
          )}
          <button
            type="button"
            className="rounded-md p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {/* Mobile navigation */}
      {open && (
        <nav
          id="mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-gray-200 bg-white lg:hidden"
          aria-label="모바일 메뉴"
        >
          <Container className="py-2">
            {navigation.map((group) => (
              <details key={group.href} className="group border-b border-gray-100 py-1" open={isPathActive(pathname, group.href)}>
                <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-3 text-sm font-semibold text-gray-800">
                  {group.label}
                  <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="pb-2 pl-3">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={pathname === item.href ? "page" : undefined}
                        className={cn(
                          "block rounded-md px-2 py-2 text-sm text-gray-600",
                          pathname === item.href && "bg-brand-50 font-semibold text-brand-800",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            {user && (
              <div className="flex items-center justify-between gap-3 px-2 py-4 text-sm sm:hidden">
                <span className="min-w-0 truncate text-gray-600">{user.email}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {showAdminLink && (
                    <Link href="/admin" onClick={close} className="rounded-md border border-brand-700 px-3 py-1.5 font-medium text-brand-700">
                      관리자
                    </Link>
                  )}
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="rounded-md bg-gray-100 px-3 py-1.5 font-medium text-gray-700">로그아웃</button>
                  </form>
                </div>
              </div>
            )}
          </Container>
        </nav>
      )}
    </header>
  );
}
