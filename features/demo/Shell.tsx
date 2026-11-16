"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Dna,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MessageSquare,
  Route,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { getNotifications, useDemo } from "./Store";
import { profiles, type Role } from "./model";
import { Button } from "@/components/ui/Button";
import { clearFiles } from "./files";
export const demoNav = [
  {
    slug: "",
    title: "나의 안전 현황",
    description: "오늘 필요한 업무부터, 하나씩 확인해요.",
    icon: LayoutDashboard,
    group: "내 연구생활",
  },
  {
    slug: "training",
    title: "교육·이수증",
    description: "교육 일정부터 이수 기록까지 한곳에서 관리해요.",
    icon: GraduationCap,
    group: "내 연구생활",
  },
  {
    slug: "requests",
    title: "신청·검토",
    description: "신청부터 보완, 검토 결과까지 한눈에 확인해요.",
    icon: ClipboardList,
    group: "내 연구생활",
  },
  {
    slug: "notifications",
    title: "알림 모아보기",
    description: "놓치기 쉬운 기한과 업무 진행 소식을 확인해요.",
    icon: Bell,
    group: "내 연구생활",
  },
  {
    slug: "assistant",
    title: "안전 도우미",
    description: "궁금한 내용을 물어보고 관련 자료를 찾아보세요.",
    icon: MessageSquare,
    group: "정보 찾기",
  },
  {
    slug: "search",
    title: "통합 검색",
    description: "SOP, 서식, 안전 규정, 교육을 한 번에 찾아요.",
    icon: Search,
    group: "정보 찾기",
  },
  {
    slug: "guides",
    title: "상황별 가이드",
    description: "무엇부터 해야 할지 막막할 때, 순서대로 따라가요.",
    icon: Route,
    group: "정보 찾기",
  },
  {
    slug: "assessment",
    title: "LMO 확인 지원",
    description: "담당자와 확인할 내용을 미리 정리해요.",
    icon: Dna,
    group: "정보 찾기",
  },
  {
    slug: "library",
    title: "SOP·자료실",
    description: "최신 예제 문서와 서식을 확인하고 보관해요.",
    icon: BookOpen,
    group: "정보 찾기",
  },
  {
    slug: "inspections",
    title: "점검·개선조치",
    description: "점검에서 발견한 사항을 조치하고 검토해요.",
    icon: ClipboardCheck,
    group: "연구실 안전",
  },
  {
    slug: "incidents",
    title: "사고·아차사고",
    description: "안전이 확보된 후, 상황을 기록하고 처리 현황을 확인해요.",
    icon: Activity,
    group: "연구실 안전",
  },
  {
    slug: "labs",
    title: "연구실·시설",
    description: "소속 연구실과 구성원, 시설 기록을 확인해요.",
    icon: FlaskConical,
    group: "연구실 안전",
  },
  {
    slug: "emergency",
    title: "긴급 안내",
    description:
      "실제 긴급 상황에서는 현장 안전과 긴급 도움 요청을 우선하세요.",
    icon: LifeBuoy,
    group: "연구실 안전",
  },
];
export function DemoShell({ children }: { children: React.ReactNode }) {
  const { state, update, reset, notify } = useDemo();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resetting, setResetting] = useState(false);
  const active = demoNav.find(
    (n) => path === `/demo${n.slug ? `/${n.slug}` : ""}`,
  );
  const unread = getNotifications(state).filter(
    (n) => !(state.read[state.role] || []).includes(n.id),
  ).length;
  const navigation = (
    <>
      <Link
        href="/demo"
        onClick={() => setOpen(false)}
        className="mb-8 flex items-center gap-2 px-2 text-lg font-bold tracking-tight text-brand-900"
      >
        <ShieldCheck size={25} className="shrink-0" aria-hidden />
        <span className="whitespace-nowrap">
          take<span className="font-normal">the</span>LMO
        </span>
        <span className="shrink-0 rounded bg-brand-50 px-1.5 py-1 text-[9px] tracking-wider text-brand-700">
          DEMO
        </span>
      </Link>
      <nav aria-label="데모 주요 메뉴" className="space-y-6">
        {["내 연구생활", "정보 찾기", "연구실 안전"].map((group) => (
          <div key={group}>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-gray-400">
              {group}
            </p>
            <div className="space-y-1">
              {demoNav
                .filter((n) => n.group === group)
                .map((n) => (
                  <Link
                    key={n.slug}
                    href={`/demo${n.slug ? `/${n.slug}` : ""}`}
                    aria-current={active?.slug === n.slug ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active?.slug === n.slug ? "bg-brand-50 font-semibold text-brand-800" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    <n.icon size={17} aria-hidden />
                    {n.title}
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-8 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">
        현재 화면은 체험용입니다.
        <br />
        가상 자료 · 브라우저에 저장
        <Button
          variant="outline"
          className="mt-3 w-full text-xs"
          disabled={resetting}
          onClick={async () => {
            if (
              !window.confirm(
                "등록한 데모 기록과 첨부파일을 초기화할까요? 이 작업은 되돌릴 수 없습니다.",
              )
            )
              return;
            setResetting(true);
            try {
              if (reset()) await clearFiles();
            } catch (e) {
              notify((e as Error).message, true);
            } finally {
              setResetting(false);
            }
          }}
        >
          체험 데이터 초기화
        </Button>
        <Link
          href="/portal"
          className="mt-3 block text-center underline underline-offset-2"
        >
          기존 포털 보기
        </Link>
      </div>
    </>
  );
  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#demo-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3"
      >
        본문 바로가기
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 overflow-y-auto border-r border-gray-200 bg-white px-4 py-7 lg:block">
        {navigation}
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-gray-900/40"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto bg-white p-5">
            <button
              className="absolute right-3 top-3 p-2"
              onClick={() => setOpen(false)}
              aria-label="탐색 닫기"
            >
              <X size={18} />
            </button>
            {navigation}
          </aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="p-2 lg:hidden"
                aria-label="메뉴 열기"
                aria-expanded={open}
                onClick={() => setOpen(true)}
              >
                <Menu size={21} />
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push(
                    `/demo/search?q=${encodeURIComponent(query.trim())}`,
                  );
                }}
                className="hidden items-center gap-2 text-gray-400 sm:flex"
              >
                <Search size={17} aria-hidden />
                <input
                  aria-label="전체 자료 검색"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="무엇을 찾고 계신가요?"
                  className="w-44 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 xl:w-64"
                />
                <button className="rounded border border-gray-200 px-2 py-1 text-xs">
                  검색
                </button>
              </form>
              <span className="text-sm font-semibold text-brand-800 sm:hidden">
                taketheLMO
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/demo/notifications"
                aria-label={`알림 ${unread}개`}
                className="relative p-2 text-gray-600"
              >
                <Bell size={21} aria-hidden />
                {unread > 0 && (
                  <span className="absolute right-0 top-0 rounded-full bg-brand-700 px-1 text-[9px] text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <div className="border-l border-gray-200 pl-3">
                <label
                  className="block text-[10px] font-medium text-gray-400"
                  htmlFor="demo-role"
                >
                  체험 역할 전환
                </label>
                <select
                  id="demo-role"
                  value={state.role}
                  onChange={(e) =>
                    update(
                      (s) => ({ ...s, role: e.target.value as Role }),
                      "체험 역할을 변경했습니다.",
                    )
                  }
                  className="max-w-44 bg-transparent py-1 text-xs font-semibold text-gray-800 sm:text-sm"
                >
                  {Object.entries(profiles).map(([role, p]) => (
                    <option key={role} value={role}>
                      {p.name} · {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>
        <main
          id="demo-main"
          className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8"
        >
          <div className="mb-7 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-xs leading-5 text-brand-800">
            <span>
              <strong>가상 데이터 체험</strong> · 입력은 이 브라우저에 저장돼요.
              실제 교육 이수·법정 신고·긴급 신고로 처리되지 않아요.
            </span>
            <Link
              href="/demo/guides"
              className="inline-flex items-center gap-1 font-semibold"
            >
              체험 가이드 <ArrowUpRight size={14} aria-hidden />
            </Link>
          </div>
          <div className="mb-7">
            <div className="mb-2 text-xs text-gray-400">
              데모연구원 <span className="mx-2">/</span>{" "}
              {active?.group || "사용자 체험"}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {active?.title || "사용자 체험"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {active?.description}
            </p>
          </div>
          {children}
          <footer className="mt-12 flex flex-wrap justify-between gap-2 border-t border-gray-200 py-5 text-xs text-gray-400">
            <span>taketheLMO · 가상 연구환경 체험</span>
            <span>DEMO BRANCH / FRONTEND PREVIEW</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
