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
import { DailyInspections } from "../inspections/DailyInspections";
import {
  dateLabel,
  deadline,
  isAdmin,
  timeLabel,
  transitionAction,
  type ActionItem,
} from "./model";
import { pushNotification, useDemo } from "./Store";
import { saveFile } from "./files";
export function Inspections() {
  const { state } = useDemo();
  const [filter, setFilter] = useState("전체");
  const actions = state.actions.filter(row => filter === "전체" || row.status === filter);
  const legacy = state.inspections.filter(row => !row.daily);
  return <div className="space-y-6">
    <DailyInspections />
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">개선조치</h2><label className="flex items-center gap-2 text-xs text-gray-500">조치 상태<select className={inputClass} value={filter} onChange={e => setFilter(e.target.value)}>{["전체", "조치 중", "검토 대기", "종결"].map(status => <option key={status}>{status}</option>)}</select></label></div>
    <div className="space-y-4">{actions.map(item => <ActionCard key={item.id} item={item} />)}{!actions.length && <Empty>해당하는 개선조치가 없습니다.</Empty>}</div>
    {!!legacy.length && <Panel title="이전 양식 점검 이력"><p className="mb-3 text-xs text-gray-500">기존 점검표의 응답을 그대로 보관합니다. 새 일상점검 달력에는 별도 기록됩니다.</p>{legacy.map(row => <details className="border-b border-gray-100 py-3" key={row.id}><summary className="cursor-pointer text-sm">{timeLabel(row.at)} · {row.inspector || "기록자 미기재"}</summary><div className="mt-3 space-y-2 text-sm">{checklist.map(item => <p key={item.id}>{item.title}: {row.results[item.id] || "미응답"}</p>)}<p className="whitespace-pre-wrap">{row.note}</p></div></details>)}</Panel>}
  </div>;
}
function ActionCard({ item }: { item: ActionItem }) {
  const { state, user, update, notify, storageScope } = useDemo();
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
            담당 {user.name} · 기한 {dateLabel(item.due)}
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
              const attachment = file ? await saveFile(file, storageScope) : undefined;
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
                      href: "/safety/inspections",
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
