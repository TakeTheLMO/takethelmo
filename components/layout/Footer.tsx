import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LogoMark } from "./Logo";
import { footerConfig, siteConfig } from "@/config/site";
import { navigation } from "@/config/navigation";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <Container className="grid gap-10 py-12 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <p className="text-lg font-bold text-gray-900">
              takethe<span className="text-brand-700">LMO</span>
            </p>
          </div>
          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-gray-500">{siteConfig.subtitle}</p>
          <p className="mt-3 max-w-sm text-sm text-gray-600">{siteConfig.description}</p>
          <dl className="mt-6 space-y-1 text-sm text-gray-600">
            <div className="flex gap-2"><dt className="w-16 shrink-0 text-gray-500">운영기관</dt><dd>{footerConfig.organization}</dd></div>
            <div className="flex gap-2"><dt className="w-16 shrink-0 text-gray-500">담당부서</dt><dd>{footerConfig.department}</dd></div>
            <div className="flex gap-2"><dt className="w-16 shrink-0 text-gray-500">문의처</dt><dd>{footerConfig.contact}</dd></div>
          </dl>
        </div>

        <nav aria-label="사이트 메뉴" className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {navigation.map((g) => (
            <div key={g.href}>
              <p className="text-sm font-semibold text-gray-900">{g.label}</p>
              <ul className="mt-2 space-y-1.5">
                {g.items.slice(0, 4).map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} className="text-sm text-gray-600 hover:text-brand-700">{i.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Container>

      <div className="border-t border-gray-100">
        <Container className="flex flex-col gap-3 py-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {footerConfig.legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="font-medium text-gray-700 hover:text-brand-700">{l.label}</Link>
              </li>
            ))}
            {footerConfig.external.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-brand-700">{l.label}</a>
              </li>
            ))}
          </ul>
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
        </Container>
      </div>
    </footer>
  );
}
