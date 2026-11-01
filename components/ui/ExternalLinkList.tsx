import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { ExternalLink } from "@/config/external-links";

// 관련 외부 시스템 바로가기 카드 목록.
export function ExternalLinkList({ links, title = "관련 외부 사이트" }: { links: ExternalLink[]; title?: string }) {
  if (links.length === 0) return null;
  return (
    <section aria-label={title} className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-500"
            >
              <span>
                <span className="block text-sm font-semibold text-gray-900">{l.label}</span>
                <span className="mt-1 block text-xs text-gray-500">{l.description}</span>
              </span>
              <ExternalLinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span className="sr-only">(새 창)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
