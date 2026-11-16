"use client";
import Link from "next/link";
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
import { history, isAdmin, profiles, uid, type Incident } from "./model";
import { pushNotification, useDemo } from "./Store";
import { saveFile } from "./files";
export function Incidents() {
  const { state, update, notify } = useDemo();
  const [creating, setCreating] = useState(false);
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("전체");
  const rows = state.incidents
    .filter((i) =>
      state.role === "researcher" ? i.owner === state.role : true,
    )
    .filter((i) => filter === "전체" || i.status === filter);
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">현재 긴급 상황인가요?</h2>
            <p className="mt-2 text-xs leading-6 text-gray-500">
              이 화면은 긴급 신고 창구가 아닙니다. 현장 안전과 필요한 긴급 도움
              요청을 먼저 해주세요.
            </p>
            <Link
              href="/demo/emergency"
              className="mt-2 inline-block text-sm font-medium text-brand-700"
            >
              긴급 안내 확인 →
            </Link>
          </div>
          <Button onClick={() => setCreating(!creating)}>
            {creating ? "작성 닫기" : "+ 사고·아차사고 기록"}
          </Button>
        </div>
      </Panel>
      {creating && (
        <Panel title="사고·아차사고 기록">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const role = state.role;
              const title = String(form.get("title")).trim();
              const body = String(form.get("body")).trim();
              const place = String(form.get("place")).trim();
              if (!title || !body || !place) {
                notify(
                  "제목, 장소, 발생 상황을 공백 없이 입력해 주세요.",
                  true,
                );
                return;
              }
              setBusy(true);
              try {
                const attachment = file ? await saveFile(file) : undefined;
                const item: Incident = {
                  id: `INC-${uid().slice(0, 8)}`,
                  title,
                  body,
                  place,
                  kind: String(form.get("kind")),
                  occurredAt: String(form.get("occurred")),
                  owner: role,
                  status: "접수",
                  file: attachment,
                  history: [
                    history(role, "접수", "가상 사고 기록을 접수했습니다."),
                  ],
                };
                if (
                  update(
                    (s) =>
                      pushNotification(
                        { ...s, incidents: [item, ...s.incidents] },
                        {
                          title: `사고 기록 접수: ${title}`,
                          detail: "내용을 확인하고 후속 조치를 기록해 주세요.",
                          href: "/demo/incidents",
                          target: "safety_admin",
                        },
                      ),
                    "사고 기록을 저장했습니다. 외부 신고는 전송되지 않습니다.",
                  )
                ) {
                  setCreating(false);
                  setFile(undefined);
                }
              } catch (error) {
                notify((error as Error).message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="보고 유형">
                <select className={inputClass} name="kind">
                  <option>아차사고</option>
                  <option>사고</option>
                </select>
              </Field>
              <Field label="발생 일시">
                <input
                  className={inputClass}
                  name="occurred"
                  type="datetime-local"
                  required
                  max={new Date(
                    Date.now() - new Date().getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)}
                />
              </Field>
              <Field label="제목">
                <input
                  className={inputClass}
                  name="title"
                  required
                  maxLength={100}
                />
              </Field>
              <Field label="발생 장소">
                <input
                  className={inputClass}
                  name="place"
                  required
                  maxLength={100}
                  placeholder="예: 연구동 A 301호"
                />
              </Field>
            </div>
            <Field label="발생 상황과 현재 조치">
              <textarea
                rows={4}
                className={inputClass}
                name="body"
                required
                maxLength={4000}
                placeholder="가상 상황으로 작성해 주세요. 민감한 개인 정보는 입력하지 마세요."
              />
            </Field>
            <FileInput onChange={setFile} />
            <Button disabled={busy} type="submit">
              {busy ? "저장 중…" : "사고 기록 접수"}
            </Button>
          </form>
        </Panel>
      )}
      <label className="flex max-w-xs items-center gap-3 text-sm">
        <span className="shrink-0">처리 상태</span>
        <select
          className={inputClass}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["전체", "접수", "확인 중", "종결"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <div className="space-y-4">
        {rows.map((i) => (
          <IncidentCard key={`${i.id}-${state.role}`} item={i} />
        ))}
        {!rows.length && (
          <Empty>
            표시할 사고 기록이 없습니다. 가상의 아차사고를 등록해 체험해 보세요.
          </Empty>
        )}
      </div>
    </div>
  );
}
function IncidentCard({ item }: { item: Incident }) {
  const { state, update } = useDemo();
  const [note, setNote] = useState("");
  const canHandle =
    (isAdmin(state.role) || state.role === "lab_manager") &&
    item.owner !== state.role &&
    item.status !== "종결";
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <Badge muted>{item.kind}</Badge>
        <Badge>{item.status}</Badge>
      </div>
      <h2 className="mt-3 font-semibold">{item.title}</h2>
      <p className="mt-2 text-xs text-gray-500">
        {item.occurredAt.replace("T", " ")} · {item.place} · 작성{" "}
        {profiles[item.owner].name}
      </p>
      <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm leading-7 text-gray-600">
        {item.body}
      </p>
      {item.file && (
        <div className="mt-4">
          <Attachment file={item.file} />
        </div>
      )}
      {canHandle && (
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const status = item.status === "접수" ? "확인 중" : "종결";
            if (
              update((s) => {
                const current = s.incidents.find((i) => i.id === item.id)!;
                if (current.status !== item.status || !note.trim())
                  throw new Error("처리 상태와 의견을 확인해 주세요.");
                return pushNotification(
                  {
                    ...s,
                    incidents: s.incidents.map((i) =>
                      i.id === item.id
                        ? {
                            ...i,
                            status,
                            history: [
                              ...i.history,
                              history(s.role, status, note),
                            ],
                          }
                        : i,
                    ),
                  },
                  {
                    title: `${item.title} · ${status}`,
                    detail: note,
                    href: "/demo/incidents",
                    target: item.owner,
                  },
                );
              }, "후속 조치 내용을 저장했습니다.")
            )
              setNote("");
          }}
        >
          <Field label="후속 조치 의견">
            <textarea
              className={inputClass}
              rows={2}
              required
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="확인 내용과 후속 조치를 적어 주세요"
            />
          </Field>
          <Button type="submit" disabled={!note.trim()}>
            {item.status === "접수" ? "확인 시작" : "후속 조치 완료 및 종결"}
          </Button>
        </form>
      )}
      <details className="mt-5">
        <summary className="cursor-pointer text-sm text-brand-700">
          처리 이력 ({item.history.length})
        </summary>
        <div className="mt-4">
          <Timeline items={item.history} />
        </div>
      </details>
    </Panel>
  );
}
