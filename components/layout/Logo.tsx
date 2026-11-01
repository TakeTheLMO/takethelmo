import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

// 로고 마크: 방패(안전) + 플라스크(연구실). public/logo.svg, app/icon.svg 와 같은 도형이다.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" className="fill-brand-700" />
      <path d="M16 5.5 25 9v6.6c0 5.4-3.7 9.6-9 11.4-5.3-1.8-9-6-9-11.4V9l9-3.5Z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.8 11h4.4M14.6 11v3.6l-3.1 5.2c-.4.7.1 1.5.9 1.5h7.2c.8 0 1.3-.8.9-1.5l-3.1-5.2V11" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.9 18.2h6.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// 표기: takethe + LMO (LMO 강조). 브랜드명 자체는 config/site.ts 의 name 을 따른다.
export function Logo({ href = "/", showSubtitle = false }: { href?: string; showSubtitle?: boolean }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5" aria-label={`${siteConfig.name} 홈`}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-xl font-bold tracking-tight text-gray-900">
          takethe<span className="text-brand-700">LMO</span>
        </span>
        {showSubtitle && (
          <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-wider text-gray-500 sm:block">
            {siteConfig.subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
