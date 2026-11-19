"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { blankInquiry } from "./InquiryForm";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  Download,
  ExternalLink,
  FileText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Badge, Empty, Field, inputClass, Panel } from "@/components/ui/DemoUI";
import { Button, ButtonLink } from "@/components/ui/Button";
import { answerQuestion, documents, guideData, searchDocuments } from "./data";
import { useDemo } from "./Store";
import { downloadBlob } from "./files";
import { uid } from "./model";
import { LedgerGuidance, PreparationGuidance } from "./Guidance";
import type { SharedPost } from "../portal-content/model";

function downloadText(name: string, body: string) {
  downloadBlob(
    new Blob(["\uFEFF", body], { type: "text/plain;charset=utf-8" }),
    name,
  );
}
export function SearchPage({ initialQuery = "", sharedPosts = [] }: { initialQuery?: string; sharedPosts?: (SharedPost & { path: string; menu: string })[] }) {
  const { state } = useDemo();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("전체");
  useEffect(() => setQuery(initialQuery), [initialQuery]);
  const results = searchDocuments(query, category);
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const shared = sharedPosts.filter(post => (category === "전체" || `${post.type} ${post.menu}`.includes(category)) && tokens.every(token => `${post.title} ${post.body} ${post.menu}`.toLowerCase().includes(token)));
  const courses = ["전체", "교육"].includes(category)
    ? state.courses.filter((c) =>
        tokens.every((t) =>
          `${c.title} ${c.description} ${c.category}`.toLowerCase().includes(t),
        ),
      )
    : [];
  return (
    <div className="space-y-6">
      <Panel>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label="검색어">
            <input
              autoFocus
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 교육, LMO, 출입, 점검"
            />
          </Field>
          <Field label="자료 유형">
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                "전체",
                "SOP",
                "LMO",
                "서식",
                "교육",
                "사고 대응",
                "안전 규정",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>추천 검색</span>
          {["교육", "LMO", "점검", "출입"].map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                setCategory("전체");
              }}
              className="rounded-full bg-gray-100 px-3 py-1.5 hover:bg-brand-50"
            >
              {q}
            </button>
          ))}
        </div>
      </Panel>
      <div aria-live="polite" className="text-sm text-gray-500">
        검색 결과{" "}
        <strong className="text-gray-900">
          {results.length + courses.length + shared.length}개
        </strong>
      </div>
      <div className="space-y-3">
        {shared.map(post => <Link key={post.id} href={`${post.path}#post-${post.id}`} className="block rounded-xl border border-brand-200 bg-white p-5 hover:border-brand-500"><Badge>{post.type}</Badge><h2 className="mt-3 font-semibold">{post.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{post.body}</p><p className="mt-3 text-xs text-brand-700">{post.menu} · 관리자 게시 자료</p></Link>)}
        {results.map((d) => (
          <Link
            key={d.id}
            href={`/library/manuals?doc=${d.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-500"
          >
            <Badge>{d.category}</Badge>
            <h2 className="mt-3 font-semibold">{d.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
              {d.body}
            </p>
            <p className="mt-3 text-xs text-gray-400">
              {d.target} · {d.version} · 개정 {d.updated}
            </p>
          </Link>
        ))}
        {courses.map((c) => (
          <Link
            href="/training/courses"
            key={c.id}
            className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-500"
          >
            <Badge>교육 과정</Badge>
            <h2 className="mt-3 font-semibold">{c.title}</h2>
            <p className="mt-2 text-sm text-gray-500">{c.description}</p>
          </Link>
        ))}
        {!results.length && !courses.length && !shared.length && (
          <Empty>
            일치하는 자료가 없습니다. 검색어를 줄이거나 자료 유형을 ‘전체’로
            바꿔 보세요.
          </Empty>
        )}
      </div>
    </div>
  );
}
const libraryCategories = ["전체", ...new Set(documents.map((d) => d.category))];
export function Library({ selectedDoc, initialCategory = "전체" }: { selectedDoc?: string; initialCategory?: string }) {
  const { state, update } = useDemo();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [onlySaved, setOnlySaved] = useState(false);
  const [sort, setSort] = useState("latest");
  const [selected, setSelected] = useState(selectedDoc || "");
  useEffect(() => setSelected(selectedDoc || ""), [selectedDoc]);
  useEffect(() => setCategory(initialCategory), [initialCategory]);
  const rows = searchDocuments(query, category)
    .filter((d) => !onlySaved || state.bookmarks.includes(d.id))
    .sort((a, b) =>
      sort === "latest"
        ? b.updated.localeCompare(a.updated)
        : a.title.localeCompare(b.title, "ko"),
    );
  const doc = documents.find((d) => d.id === selected);
  return (
    <div className="space-y-6">
      <Panel>
        <div role="group" aria-label="문서 분류" className="mb-4 flex flex-wrap gap-2">
          {libraryCategories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`min-h-9 rounded-full border px-3 text-xs font-medium ${category === c ? "border-brand-600 bg-brand-50 text-brand-800" : "border-gray-200 text-gray-600 hover:border-brand-300"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <Field label="자료 검색">
              <input
                className={inputClass}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="문서 제목 또는 키워드"
              />
            </Field>
          </div>
          <Field label="정렬">
            <select
              className={inputClass}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="latest">최근 개정순</option>
              <option value="name">이름순</option>
            </select>
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlySaved}
              onChange={(e) => setOnlySaved(e.target.checked)}
            />
            즐겨찾기만
          </label>
        </div>
      </Panel>
      {doc && (
        <Panel
          title={doc.title}
          aside={
            <button
              onClick={() => setSelected("")}
              className="text-xs text-gray-500"
            >
              문서 닫기
            </button>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge>{doc.category}</Badge>
            <Badge muted>{doc.version}</Badge>
            <Badge muted>{doc.target}</Badge>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            최신 예제 · 개정 {doc.updated} · 가상 문서 / 공식 서식 아님
          </p>
          <div className="whitespace-pre-wrap rounded-xl bg-gray-50 p-5 text-sm leading-8 text-gray-700">
            {doc.body}
          </div>
          <details className="my-4 text-sm">
            <summary className="cursor-pointer font-medium">개정 이력</summary>
            <ul className="mt-3 space-y-2 text-gray-500">
              {doc.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </details>
          <Button
            onClick={() =>
              downloadText(
                `예제_${doc.title}.txt`,
                `${doc.title}\n${doc.version} · ${doc.updated}\n\n${doc.body}`,
              )
            }
          >
            <Download size={16} />
            예제 문서 다운로드
          </Button>
        </Panel>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((d) => (
          <article
            key={d.id}
            className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-gray-50 p-2 text-brand-600">
                <FileText size={21} aria-hidden />
              </span>
              <button
                aria-label={`${d.title} 즐겨찾기`}
                aria-pressed={state.bookmarks.includes(d.id)}
                onClick={() =>
                  update((s) => ({
                    ...s,
                    bookmarks: s.bookmarks.includes(d.id)
                      ? s.bookmarks.filter((id) => id !== d.id)
                      : [...s.bookmarks, d.id],
                  }))
                }
                className="rounded-lg p-2 text-brand-600"
              >
                <Bookmark
                  size={18}
                  fill={
                    state.bookmarks.includes(d.id) ? "currentColor" : "none"
                  }
                />
              </button>
            </div>
            <div className="mb-3 mt-5">
              <Badge muted>{d.category}</Badge>
            </div>
            <h2 className="text-sm font-semibold leading-6">{d.title}</h2>
            <p className="mt-2 text-xs text-gray-500">{d.target}</p>
            <p className="mb-5 mt-2 text-xs text-gray-400">
              {d.version} · 개정 {d.updated}
            </p>
            <Button
              variant="outline"
              className="mt-auto"
              onClick={() => {
                setSelected(d.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              문서 보기
            </Button>
          </article>
        ))}
      </div>
      {!rows.length && (
        <Empty>
          {category === "전체"
            ? "표시할 문서가 없습니다. 검색 조건을 확인해 주세요."
            : `'${category}' 분류에 맞는 문서가 없습니다. 분류를 '전체'로 바꾸거나 검색어를 확인해 주세요.`}
        </Empty>
      )}
      <h2 className="pt-4 text-sm font-semibold text-gray-700">업무별 작성 안내</h2>
      <LedgerGuidance />
      <PreparationGuidance />
    </div>
  );
}
export function Assistant() {
  const { state, update } = useDemo();
  const [question, setQuestion] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current)
      end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    mounted.current = true;
  }, [state.chat.length]);
  function send(text: string) {
    if (!text.trim()) return;
    const response = answerQuestion(text.trim());
    if (
      update((s) => ({
        ...s,
        chat: [
          ...s.chat,
          { id: uid(), role: "user", text: text.trim() },
          { id: uid(), role: "assistant", ...response },
        ],
      }))
    )
      setQuestion("");
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_17rem]">
      <Panel className="overflow-hidden">
        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand-700" />
            <strong className="text-sm">안전 도우미</strong>
            <Badge muted>참고 안내 · AI 미연결</Badge>
          </div>
          <button
            onClick={() =>
              update(
                (s) => ({ ...s, chat: s.chat.slice(0, 1) }),
                "대화를 초기화했습니다.",
              )
            }
            className="text-xs text-gray-500"
          >
            대화 초기화
          </button>
        </div>
        <div
          className="max-h-[52vh] min-h-64 space-y-5 overflow-y-auto pr-2"
          role="log"
          aria-label="안전 도우미 대화"
          aria-live="polite"
        >
          {state.chat.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl p-4 text-sm leading-7 ${m.role === "user" ? "bg-brand-800 text-white" : "bg-gray-50 text-gray-700"}`}
              >
                <p className="mb-1 text-[10px] font-semibold opacity-60">
                  {m.role === "user" ? "나" : "안전 도우미 · 예제 자료 기반"}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                {!!m.sources?.length && (
                  <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
                    <p className="text-xs font-semibold">참고한 가상 자료</p>
                    {m.sources.map((id) => (
                      <Link
                        key={id}
                        href={`/library/manuals?doc=${id}`}
                        className="block text-xs text-brand-700 underline underline-offset-4"
                      >
                        {documents.find((d) => d.id === id)?.title} ↗
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(question);
          }}
          className="mt-6 flex items-end gap-2 border-t border-gray-100 pt-4"
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">도우미에게 질문</span>
            <textarea
              className={inputClass}
              rows={2}
              maxLength={1000}
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="안전 업무에 대해 물어보세요"
            />
          </label>
          <Button
            type="submit"
            aria-label="질문 보내기"
            disabled={!question.trim()}
            className="mb-1 px-3"
          >
            <Send size={18} />
          </Button>
        </form>
        <p className="mt-2 text-[11px] leading-5 text-gray-400">
          실제 AI 모델·외부 검색 연결 없음. 법적 판단과 기관별 실험 절차는
          담당자에게 확인해 주세요.
        </p>
      </Panel>
      <Panel title="이렇게 물어보세요">
        <div className="space-y-2">
          {[
            "교육 이수증은 어디에 등록해요?",
            "LMO 해당 여부를 확인하고 싶어요",
            "점검 후 개선조치는 어떻게 해요?",
            "보완 요청을 받았어요",
          ].map((q) => (
            <button
              onClick={() => send(q)}
              key={q}
              className="w-full rounded-xl border border-gray-200 p-3 text-left text-xs leading-6 text-gray-600 hover:border-brand-500"
            >
              {q}
            </button>
          ))}
        </div>
        <Link
          href="/safety/emergency"
          className="mt-6 block text-sm font-medium text-brand-700"
        >
          긴급 상황 안내 바로가기 →
        </Link>
      </Panel>
    </div>
  );
}
export function Guides() {
  const { state, update } = useDemo();
  const [selected, setSelected] = useState("first");
  const guide = guideData.find((g) => g.id === selected)!;
  const key = (index: number) => `${state.role}:${guide.id}:${index}`;
  const completed = guide.steps.filter((_, i) =>
    state.guideSteps.includes(key(i)),
  ).length;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[17rem_1fr]">
      <div className="space-y-3">
        {guideData.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelected(g.id)}
            className={`w-full rounded-xl border p-5 text-left ${selected === g.id ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white"}`}
          >
            <p className="text-sm font-semibold">{g.title}</p>
            <p className="mt-2 text-xs leading-5 text-gray-500">{g.subtitle}</p>
          </button>
        ))}
      </div>
      <Panel
        title={guide.title}
        aside={
          <Badge>
            {completed} / {guide.steps.length} 확인
          </Badge>
        }
      >
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${(completed / guide.steps.length) * 100}%` }}
          />
        </div>
        <div className="space-y-4">
          {guide.steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${state.guideSteps.includes(key(i)) ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  {state.guideSteps.includes(key(i)) ? (
                    <Check size={14} />
                  ) : (
                    i + 1
                  )}
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {s.text}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pl-10">
                <Link
                  href={s.href}
                  className="text-xs font-medium text-brand-700"
                >
                  관련 화면 열기 →
                </Link>
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={state.guideSteps.includes(key(i))}
                    onChange={() =>
                      update((st) => ({
                        ...st,
                        guideSteps: st.guideSteps.includes(key(i))
                          ? st.guideSteps.filter((k) => k !== key(i))
                          : [...st.guideSteps, key(i)],
                      }))
                    }
                  />
                  확인했어요
                </label>
              </div>
            </div>
          ))}
        </div>
        {completed === guide.steps.length && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-brand-50 p-4 text-sm text-brand-800"
          >
            모든 안내를 확인했어요. 실제 절차 완료 여부는 기관 담당자에게 확인해
            주세요.
          </p>
        )}
      </Panel>
    </div>
  );
}
const questions = [
  { id: "organism", title: "살아 있는 생물체를 취급하거나 도입할 예정인가요?" },
  { id: "modified", title: "유전물질의 변형 여부와 관련 자료를 확인했나요?" },
  {
    id: "facility",
    title: "기존 시설의 신고·허가 기록과 예정 업무 범위를 확인했나요?",
  },
  { id: "animal", title: "동물에게 물질을 투여하는 실험이 포함되나요?" },
];
export function Assessment() {
  const router = useRouter();
  const { state, update } = useDemo();
  const [answers, setAnswers] = useState<Record<string, string>>(
    state.assessment,
  );
  const [show, setShow] = useState(
    questions.every((q) =>
      ["예", "아니요", "모르겠어요"].includes(state.assessment[q.id]),
    ),
  );
  const unclear = Object.values(answers).some((a) => a === "모르겠어요");
  const result = `LMO 확인 지원 · 사전 정리\n법적 판정이 아닙니다.\n${questions.map((q) => `${q.title} ${answers[q.id] || "미응답"}`).join("\n")}\n\n확인할 자료: 대상 생물체 및 유전물질 정보, 예정 업무 설명, 시설의 기존 신고·허가 기록, 기관 담당자 확인.`;
  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <Panel title="업무 상황을 알려주세요">
        <p className="mb-4 text-sm leading-6 text-gray-500">
          이 질문은 담당자에게 확인할 정보를 정리합니다.
          응답만으로 LMO 해당 여부나 신고 의무를 판정하지 않습니다.
        </p>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
          <p className="text-sm leading-6 text-gray-700">
            이미 물어볼 내용이 있다면 질문 없이 바로 문의할 수 있어요.
          </p>
          <ButtonLink href="/lmo/inquiry" variant="outline">
            IBC 사전 문의 바로 작성
          </ButtonLink>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              update(
                (s) => ({ ...s, assessment: answers }),
                "확인 항목을 저장했습니다.",
              )
            )
              setShow(true);
          }}
          className="space-y-7"
        >
          {questions.map((q, i) => (
            <fieldset key={q.id}>
              <legend className="mb-3 text-sm font-medium">
                {i + 1}. {q.title}
              </legend>
              <div className="flex flex-wrap gap-2">
                {["예", "아니요", "모르겠어요"].map((a) => (
                  <label
                    key={a}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${answers[q.id] === a ? "border-brand-500 bg-brand-50" : "border-gray-200"}`}
                  >
                    <input
                      type="radio"
                      required
                      name={q.id}
                      checked={answers[q.id] === a}
                      value={a}
                      onChange={() => {
                        setAnswers((prev) => ({ ...prev, [q.id]: a }));
                        setShow(false);
                      }}
                    />
                    {a}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <Button type="submit">확인할 항목 정리하기</Button>
        </form>
      </Panel>
      <Panel title="나의 확인 목록">
        {!show ? (
          <Empty>
            네 문항에 응답하면 확인 항목이 표시됩니다. 이전에 세 문항을
            저장했다면 새로 추가된 동물 투여 질문에 답하고 다시 정리해 주세요.
          </Empty>
        ) : (
          <div className="space-y-5">
            <Badge>
              {unclear
                ? "추가 정보 확인이 필요해요"
                : "기관 담당자의 검토가 필요해요"}
            </Badge>
            <p className="text-sm leading-7 text-gray-600">
              {unclear
                ? "확인되지 않은 정보가 있어요. 추측해서 진행하지 말고 관련 자료를 모아 담당자에게 문의하세요."
                : answers.organism === "아니요"
                  ? "살아 있는 생물체를 취급하지 않는다고 답했어요. 재료 특성과 예정 업무를 담당자에게 설명하고 적용 절차를 확인하세요."
                  : "대상 생물체와 유전물질, 예정 업무, 시설의 기존 기록을 함께 검토해야 해요."}
            </p>
            <ul className="space-y-3 text-sm text-gray-700">
              {[
                "대상 생물체·도입 유전물질 관련 자료 준비",
                answers.modified === "예"
                  ? "확인한 변형 관련 자료를 담당자에게 전달"
                  : "유전물질 변형 여부와 자료 확인",
                answers.facility === "예"
                  ? "예정 업무가 기존 시설 기록 범위에 포함되는지 확인"
                  : "시설 신고·허가 기록 및 업무 범위 확인",
                "기관 LMO 담당자에게 검토 요청",
              ].map((t) => (
                <li className="flex gap-2" key={t}>
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm leading-7 text-gray-700">
              <h3 className="font-semibold text-brand-900">
                IBC 사전 문의로 절차를 확인하세요
              </h3>
              <p className="mt-2">
                {answers.animal === "예" || answers.animal === "모르겠어요"
                  ? "동물 투여 계획이 있거나 확실하지 않다면 사용 물질과 실험 개요를 정리해 담당자에게 문의하세요."
                  : "동물 투여에 ‘아니요’를 선택해도 다른 실험 조건에 대해 사전 문의할 수 있습니다."}
              </p>
              <p className="mt-2 text-xs leading-6">
                이 확인 결과와 사전 문의 답변은 IBC 승인이나 실험 시작 허가가
                아닙니다. 실제 절차는 기관 담당자에게 확인하세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const snapshot = Object.fromEntries(
                    questions.map((q) => [q.id, answers[q.id]]),
                  );
                  if (
                    update((s) => {
                      const key = `${s.role}:IBC 사전 문의`;
                      const existing = s.requestDrafts?.[key];
                      return {
                        ...s,
                        requestDrafts: {
                          ...s.requestDrafts,
                          [key]: {
                            title:
                              existing?.title || "LMO 확인 결과 관련 사전 문의",
                            body: existing?.body || "",
                            inquiry: {
                              ...(existing?.inquiry || blankInquiry()),
                              assessment: snapshot,
                            },
                            updatedAt: new Date().toISOString(),
                          },
                        },
                      };
                    }, "확인 결과를 문의 초안에 연결했습니다. 기존 입력 내용은 유지합니다.")
                  )
                    router.push("/mypage/requests?kind=ibc");
                }}
              >
                IBC 사전 문의 작성
              </Button>
              <Button
                onClick={() => downloadText("LMO_사전확인_예제.txt", result)}
                variant="outline"
              >
                확인 목록 다운로드
              </Button>
              <ButtonLink href="/mypage/requests?kind=lmo" variant="outline">
                시설 변경 검토 요청
              </ButtonLink>
            </div>
            <a
              href="https://www.lmosafety.or.kr/mps"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand-700"
            >
              공식 LMO정보시스템 확인 <ExternalLink size={14} />
            </a>
          </div>
        )}
      </Panel>
    </div>
  );
}
export function Emergency() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand-900 p-6 text-white sm:p-8">
        <p className="text-xs text-brand-200">SAFETY FIRST</p>
        <h2 className="mt-3 text-xl font-semibold">
          화면 입력보다 현장의 안전이 먼저입니다.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-100">
          안전한 위치를 확보하고 필요한 긴급 도움을 요청하세요. 구체적인 대응은
          기관 비상계획과 승인된 SOP를 따르세요. 이 사이트의 채팅과 보고서는 구조
          요청을 전송하지 않습니다.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            n: "01",
            t: "현장 안전 확보",
            d: "위험을 인지하면 기관 비상계획에 따라 행동하고 주변에 상황을 알리세요.",
          },
          {
            n: "02",
            t: "기관 연락망 확인",
            d: "현장에 게시된 실제 비상 연락망과 긴급 신고 경로를 사용하세요.",
          },
          {
            n: "03",
            t: "안전 확보 후 기록",
            d: "발생 시각과 장소, 관찰한 상황을 정리해 기관 담당자에게 전달하세요.",
          },
        ].map((s) => (
          <Panel key={s.n}>
            <span className="text-2xl font-light text-brand-500">{s.n}</span>
            <h2 className="mt-4 font-semibold">{s.t}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-500">{s.d}</p>
          </Panel>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="연락 담당 부서">
          <div className="space-y-4">
            {[
              "연구실 안전담당자",
              "기관 안전관리 부서",
              "기관 LMO 담당자",
            ].map((s) => (
              <div
                key={s}
                className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-4 text-sm"
              >
                <span>{s}</span>
                <Badge muted>기관 연락처 확인 필요</Badge>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-gray-500">
            현장에 게시된 비상 연락망에서 실제 연락처를 확인하세요. 이 화면은 긴급 신고를 전송하지 않습니다.
          </p>
        </Panel>
        <Panel title="확인 경로">
          <div className="space-y-3">
            <a
              href="https://www.lmosafety.or.kr/mps"
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-gray-200 p-4 text-sm"
            >
              시험·연구용 LMO정보시스템 ↗
            </a>
            <Link
              href="/library/manuals?doc=guide-emergency"
              className="block rounded-lg border border-gray-200 p-4 text-sm"
            >
              사고 대응 비상연락망 및 대응 체계 (예제) →
            </Link>
            <ButtonLink href="/safety/incidents" className="w-full">
              안전 확보 후 사고 기록하기
            </ButtonLink>
          </div>
        </Panel>
      </div>
    </div>
  );
}
