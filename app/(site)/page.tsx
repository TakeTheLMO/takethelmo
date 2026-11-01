import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, Dna, FlaskConical, GraduationCap, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";
import { getSessionUser } from "@/lib/auth/session";

const quickMenu = [
  { label: "안전관리", desc: "점검 · 개선조치", href: "/safety", icon: ShieldCheck },
  { label: "연구실 관리", desc: "연구실 · 구성원", href: "/labs", icon: FlaskConical },
  { label: "안전교육", desc: "교육과정 · 이수현황", href: "/training", icon: GraduationCap },
  { label: "LMO 관리", desc: "연구시설 · 관리대장", href: "/lmo", icon: Dna },
  { label: "사고보고", desc: "사고 · 아차사고", href: "/safety/incidents", icon: AlertTriangle },
  { label: "자료실", desc: "매뉴얼 · 서식 · MSDS", href: "/library", icon: BookOpen },
];

// 데이터 연동 전까지는 허위 수치 대신 빈 상태를 보여준다.
// 각 섹션은 해당 기능이 구현되면 features/<모듈>/ 의 서버 컴포넌트로 교체한다.
const sections = [
  { title: "안전관리 현황", href: "/labs/safety-status", message: "점검·교육·사고보고 데이터가 연동되면 현황이 표시됩니다." },
  { title: "최신 공지사항", href: "/community/notices", message: "등록된 공지사항이 없습니다." },
  { title: "연구실 안전정보", href: "/safety", message: "등록된 안전정보가 없습니다." },
  { title: "최근 등록 자료", href: "/library", message: "등록된 자료가 없습니다." },
];

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <>
      <section className="relative overflow-hidden bg-brand-900 text-white">
        {/* 장식용 격자 패턴 (의미 없음) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden
        />
        <Container className="relative py-16 sm:py-24">
          <p className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-brand-100">
            {siteConfig.subtitle}
          </p>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            안전한 연구환경, {siteConfig.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-brand-100 sm:text-lg">{siteConfig.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/safety" variant="light">
              안전관리 바로가기
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/labs" variant="ghostLight">연구실 정보 확인</ButtonLink>
            {!user && <ButtonLink href="/login" variant="ghostLight">로그인</ButtonLink>}
          </div>
        </Container>
      </section>

      <Container className="relative -mt-8 pb-4">
        <section aria-labelledby="quick-menu">
          <h2 id="quick-menu" className="sr-only">주요 기능</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickMenu.map(({ label, desc, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{label}</span>
                  <span className="text-xs text-gray-500">{desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Container>

      <Container className="py-12">
        <div className="grid gap-8 md:grid-cols-2">
          {sections.map((s, i) => (
            <section key={s.title} aria-labelledby={`home-sec-${i}`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 id={`home-sec-${i}`} className="text-lg font-semibold text-gray-900">{s.title}</h2>
                <Link href={s.href} className="flex items-center gap-0.5 text-sm text-gray-500 hover:text-brand-700">
                  전체보기 <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
              <EmptyState message={s.message} />
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
