"use client";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCheck,
  ClipboardCheck,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { useDemo } from "./Store";
import {
  canReview,
  dateLabel,
  deadline,
  profiles,
  requestComplete,
  requestNeedsOwner,
  requestNeedsReviewer,
} from "./model";
import { documents } from "./data";
import { Badge, Empty, Panel } from "@/components/ui/DemoUI";
import { ButtonLink } from "@/components/ui/Button";
export function Home() {
  const { state } = useDemo();
  const profile = profiles[state.role];
  const done = state.courses.filter((c) =>
    state.enrollments.some(
      (e) =>
        e.owner === state.role &&
        e.courseId === c.id &&
        e.status === "등록 완료",
    ),
  ).length;
  const myRequests = state.requests.filter(
    (r) => r.owner === state.role && !requestComplete(r),
  );
  const review = state.requests.filter(
    (r) => canReview(state.role, r) && requestNeedsReviewer(r),
  );
  const actions = state.actions.filter(
    (a) => a.owner === state.role && a.status !== "종결",
  );
  const pendingCourses = state.courses.filter(
    (c) =>
      !state.enrollments.some(
        (e) =>
          e.owner === state.role &&
          e.courseId === c.id &&
          e.status === "등록 완료",
      ),
  );
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-6 rounded-2xl bg-brand-900 p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="mb-3 text-xs tracking-wide text-brand-200">
            MY LAB, MY SAFETY
          </p>
          <h2 className="text-xl font-semibold sm:text-2xl">
            {profile.name}님, 오늘도 안전한 연구를 시작해요.
          </h2>
          <p className="mt-3 text-sm leading-6 text-brand-100">
            {profile.scope} · {profile.label}
            <br />
            남은 교육 {state.courses.length - done}개와 개선조치{" "}
            {actions.length}건을 확인해 주세요.
          </p>
          <ButtonLink href="/demo/guides" variant="light" className="mt-5">
            처음이라면, 상황별 가이드 <ArrowRight size={16} aria-hidden />
          </ButtonLink>
        </div>
        <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-full border border-brand-500 bg-brand-800 sm:flex">
          <ShieldCheck
            size={52}
            strokeWidth={1.2}
            className="text-brand-100"
            aria-hidden
          />
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "교육 기록 등록",
            count: `${done} / ${state.courses.length}`,
            foot: "과정별 이수증 등록 현황",
            href: "training",
            icon: GraduationCap,
          },
          {
            label: "진행 중인 신청·문의",
            count: `${myRequests.length}건`,
            foot: "보완·추가 정보 요청 확인",
            href: "requests",
            icon: BookOpen,
          },
          {
            label: "나의 개선조치",
            count: `${actions.length}건`,
            foot: "증빙 등록 후 검토 요청",
            href: "inspections",
            icon: ClipboardCheck,
          },
          {
            label: "검토·답변할 요청",
            count: `${review.length}건`,
            foot:
              state.role === "researcher"
                ? "담당자 역할에서 검토 가능"
                : "제출된 내용을 확인해 주세요",
            href: "requests",
            icon: CheckCheck,
          },
        ].map((item) => (
          <Link
            href={`/demo/${item.href}`}
            key={item.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-500 sm:p-5"
          >
            <div className="flex items-center justify-between text-xs text-gray-500 sm:text-sm">
              {item.label}
              <item.icon size={17} className="text-brand-600" aria-hidden />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">
              {item.count}
            </p>
            <p className="mt-2 text-[11px] text-gray-400">{item.foot}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="지금 확인할 일"
          aside={
            <Badge>
              {pendingCourses.length +
                actions.length +
                myRequests.filter(requestNeedsOwner).length}
              건
            </Badge>
          }
        >
          <div className="divide-y divide-gray-100">
            {pendingCourses.map((c) => (
              <Link
                key={c.id}
                href="/demo/training"
                className="flex items-center justify-between gap-3 py-4 first:pt-0"
              >
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    교육 이수증 등록 · {dateLabel(c.due)}까지
                  </p>
                </div>
                <Badge>{deadline(c.due)}</Badge>
              </Link>
            ))}
            {actions.map((a) => (
              <Link
                key={a.id}
                href="/demo/inspections"
                className="flex items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    개선조치 · {a.status}
                  </p>
                </div>
                <Badge>{deadline(a.due)}</Badge>
              </Link>
            ))}
            {myRequests.filter(requestNeedsOwner).map((r) => (
              <Link
                key={r.id}
                href="/demo/requests"
                className="block py-4 text-sm font-medium"
              >
                {r.title}
                <span className="ml-2 text-brand-700">{r.status}</span>
              </Link>
            ))}
            {!pendingCourses.length &&
              !actions.length &&
              !myRequests.some(requestNeedsOwner) && (
                <Empty>현재 완료할 일이 없습니다.</Empty>
              )}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel
            title="무엇이 궁금하세요?"
            className="border-brand-100 bg-brand-50/50"
          >
            <MessageSquare
              size={26}
              className="mb-4 text-brand-700"
              aria-hidden
            />
            <p className="text-sm leading-6 text-gray-600">
              흩어진 안전정보,
              <br />
              도우미에게 물어보고 근거까지 확인해요.
            </p>
            <ButtonLink href="/demo/assistant" className="mt-5 w-full">
              안전 도우미와 대화하기 <ArrowRight size={15} />
            </ButtonLink>
            <p className="mt-3 text-center text-[11px] text-gray-400">
              가상 자료를 사용하는 규칙 기반 데모
            </p>
          </Panel>
          <Panel title="나의 연구실">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">바이오융합연구실</p>
                <p className="mt-1 text-xs text-gray-500">
                  연구동 A · 301호 · 가상 시설
                </p>
              </div>
              <Badge muted>LAB 01</Badge>
            </div>
            <Link
              href="/demo/labs"
              className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-brand-700"
            >
              구성원과 시설 기록 확인 <ArrowRight size={14} />
            </Link>
          </Panel>
        </div>
      </div>
      <Panel
        title="즐겨찾는 자료"
        aside={
          <Link href="/demo/library" className="text-xs text-gray-500">
            자료실 전체보기 →
          </Link>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {documents
            .filter((d) => state.bookmarks.includes(d.id))
            .map((d) => (
              <Link
                href={`/demo/library?doc=${d.id}`}
                key={d.id}
                className="rounded-xl border border-gray-200 p-4 hover:border-brand-500"
              >
                <Badge muted>{d.category}</Badge>
                <p className="mt-3 text-sm font-semibold">{d.title}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {d.version} · {d.updated}
                </p>
              </Link>
            ))}
          {!state.bookmarks.length && (
            <Empty>자료실에서 자주 쓰는 문서를 저장해 보세요.</Empty>
          )}
        </div>
      </Panel>
    </div>
  );
}
