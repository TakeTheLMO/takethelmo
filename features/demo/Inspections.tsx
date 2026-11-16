"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Attachment,
  Badge,
  Empty,
  Field,
  FileInput,
  inputClass,
  Panel,
  Timeline,
} from "@/components/ui/DemoUI";
import { checklist } from "./data";
import {
  dateLabel,
  deadline,
  history,
  isAdmin,
  profiles,
  timeLabel,
  transitionAction,
  uid,
  type ActionItem,
} from "./model";
import { pushNotification, useDemo } from "./Store";
import { saveFile } from "./files";
export function Inspections() {
  const { state, update } = useDemo();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [due, setDue] = useState(state.courses[0].due);
  const [filter, setFilter] = useState("전체");
  const bad = checklist.filter((c) => results[c.id] === "부적합");
  const actions = state.actions
    .filter((a) =>
      state.role === "researcher" ? a.owner === state.role : true,
    )
    .filter((a) => filter === "전체" || a.status === filter);
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">바이오융합연구실 · 일상점검</h2>
            <p className="mt-2 text-xs text-gray-500">
              점검 항목은 가상 예시입니다. 실제 기관의 승인된 점검표를
              사용하세요.
            </p>
          </div>
          <Button onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "점검 닫기" : "+ 점검 시작"}
          </Button>
        </div>
      </Panel>
      {open && (
        <Panel title="새 안전점검">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                checklist.some((c) => !results[c.id]) ||
                (bad.length && !note.trim())
              )
                return;
              const owner = state.role;
              const generated: ActionItem[] = bad.map((c) => ({
                id: `ACT-${uid().slice(0, 8)}`,
                title: c.title + " 개선",
                note,
                status: "조치 중",
                owner,
                due,
                history: [
                  history(owner, "조치 중", `점검에서 부적합 확인: ${note}`),
                ],
              }));
              if (
                update(
                  (s) =>
                    pushNotification(
                      {
                        ...s,
                        inspections: [
                          {
                            id: uid(),
                            at: new Date().toISOString(),
                            owner,
                            results,
                            note,
                          },
                          ...s.inspections,
                        ],
                        actions: [...generated, ...s.actions],
                      },
                      {
                        title: `안전점검 저장 · 개선조치 ${bad.length}건`,
                        detail: "부적합 항목은 개선조치 목록에 등록됩니다.",
                        target: owner,
                        href: "/demo/inspections",
                      },
                    ),
                  `점검을 저장하고 개선조치 ${bad.length}건을 만들었습니다.`,
                )
              ) {
                setOpen(false);
                setResults({});
                setNote("");
              }
            }}
          >
            {checklist.map((c, i) => (
              <fieldset
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4"
              >
                <legend className="mb-3 w-full text-sm font-semibold">
                  {i + 1}. {c.title}
                </legend>
                <p className="text-xs text-gray-500">{c.detail}</p>
                <div className="flex flex-wrap gap-2">
                  {["적합", "부적합", "해당 없음"].map((v) => (
                    <label
                      key={v}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${results[c.id] === v ? "border-brand-500 bg-brand-50" : "border-gray-200"}`}
                    >
                      <input
                        type="radio"
                        required
                        name={c.id}
                        value={v}
                        checked={results[c.id] === v}
                        onChange={() =>
                          setResults((p) => ({ ...p, [c.id]: v }))
                        }
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <Field label={bad.length ? "부적합 내용 (필수)" : "점검 메모"}>
              <textarea
                className={inputClass}
                rows={3}
                maxLength={2000}
                required={bad.length > 0}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            {bad.length > 0 && (
              <Field label="개선조치 기한">
                <input
                  type="date"
                  className={inputClass}
                  required
                  min={new Date().toLocaleDateString("sv-SE")}
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </Field>
            )}
            <Button type="submit">
              점검 저장{bad.length > 0 && ` · 개선조치 ${bad.length}건 생성`}
            </Button>
          </form>
        </Panel>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">개선조치</h2>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          조치 상태
          <select
            className={inputClass}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["전체", "조치 중", "검토 대기", "종결"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="space-y-4">
        {actions.map((a) => (
          <ActionCard key={`${a.id}-${state.role}`} item={a} />
        ))}
        {!actions.length && <Empty>해당하는 개선조치가 없습니다.</Empty>}
      </div>
      <Panel title="점검 이력">
        {!state.inspections.length ? (
          <Empty>아직 저장한 점검이 없습니다.</Empty>
        ) : (
          <div className="space-y-3">
            {state.inspections
              .filter(
                (i) => state.role !== "researcher" || i.owner === state.role,
              )
              .map((i) => (
                <details
                  key={i.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <summary className="cursor-pointer text-sm">
                    {timeLabel(i.at)} · {profiles[i.owner].name} · 부적합{" "}
                    {
                      Object.values(i.results).filter((v) => v === "부적합")
                        .length
                    }
                    건
                  </summary>
                  <div className="mt-4 space-y-2 text-xs text-gray-500">
                    {checklist.map((c) => (
                      <p key={c.id}>
                        {c.title} · {i.results[c.id]}
                      </p>
                    ))}
                    <p className="whitespace-pre-wrap">
                      {i.note || "추가 메모 없음"}
                    </p>
                  </div>
                </details>
              ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
function ActionCard({ item }: { item: ActionItem }) {
  const { state, update, notify } = useDemo();
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<ActionItem["status"]>("종결");
  const submit = item.owner === state.role && item.status === "조치 중";
  const review =
    item.owner !== state.role &&
    item.status === "검토 대기" &&
    (isAdmin(state.role) || state.role === "lab_manager");
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge>{item.status}</Badge>
          <h3 className="mt-3 font-semibold">{item.title}</h3>
          <p className="mt-2 text-xs text-gray-500">
            담당 {profiles[item.owner].name} · 기한 {dateLabel(item.due)}
          </p>
        </div>
        {item.status !== "종결" && <Badge muted>{deadline(item.due)}</Badge>}
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
        {item.note}
      </p>
      {item.file && (
        <div className="mt-4">
          <Attachment file={item.file} />
        </div>
      )}
      {(submit || review) && (
        <form
          className="mt-5 space-y-4 border-t border-gray-100 pt-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const role = state.role;
            setBusy(true);
            try {
              const attachment = file ? await saveFile(file) : undefined;
              const saved = update(
                (s) => {
                  const current = s.actions.find((a) => a.id === item.id)!;
                  const next = transitionAction(
                    current,
                    role,
                    submit ? "검토 대기" : decision,
                    note,
                    attachment,
                  );
                  return pushNotification(
                    {
                      ...s,
                      actions: s.actions.map((a) =>
                        a.id === item.id ? next : a,
                      ),
                    },
                    {
                      title: `${item.title} · ${next.status}`,
                      detail: note,
                      href: "/demo/inspections",
                      target: submit ? "safety_admin" : item.owner,
                    },
                  );
                },
                submit
                  ? "조치 증빙을 저장하고 검토를 요청했습니다."
                  : `개선조치를 ${decision} 처리했습니다.`,
              );
              if (saved) {
                setNote("");
                setFile(undefined);
              }
            } catch (e) {
              notify((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {review && (
            <Field label="개선조치 검토 결과">
              <select
                className={inputClass}
                value={decision}
                onChange={(e) =>
                  setDecision(e.target.value as ActionItem["status"])
                }
              >
                <option>종결</option>
                <option value="조치 중">재조치 요청</option>
              </select>
            </Field>
          )}
          <Field label={submit ? "조치 내용" : "개선조치 검토 의견"}>
            <textarea
              className={inputClass}
              required
              maxLength={2000}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {submit && <FileInput required={!item.file} onChange={setFile} />}
          <Button
            type="submit"
            disabled={busy || !note.trim() || (submit && !file && !item.file)}
          >
            {busy
              ? "저장 중…"
              : submit
                ? "조치 완료 및 검토 요청"
                : "개선조치 검토 저장"}
          </Button>
        </form>
      )}
      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-medium text-brand-700">
          조치 이력 ({item.history.length})
        </summary>
        <div className="mt-4">
          <Timeline items={item.history} />
        </div>
      </details>
    </Panel>
  );
}
