"use client";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Field, inputClass, Panel } from "@/components/ui/DemoUI";
import { isAdmin, uid } from "./model";
import { useDemo } from "./Store";
import { LedgerPanel } from "./LedgerPanel";
export function Labs({ initialTab = "시설 정보" }: { initialTab?: string }) {
  const { state, update, notify } = useDemo();
  const [tab, setTab] = useState(initialTab);
  const [adding, setAdding] = useState(false);
  const membersEditable = state.role === "lab_manager" || isAdmin(state.role);
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <Badge>{state.lab ? "등록 연구실" : "연구실 정보 미등록"}</Badge>
            <h2 className="mt-4 text-xl font-semibold">{state.lab?.name || "소속 연구실을 등록해 주세요"}</h2>
            <p className="mt-2 text-sm text-gray-500">
              {state.lab?.location || "위치 미등록"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold text-brand-800">
              {state.members.filter((m) => m.active).length}
              <span className="ml-1 text-sm font-normal text-gray-400">명</span>
            </p>
            <p className="mt-2 text-xs text-gray-500">활동 중인 구성원</p>
          </div>
        </div>
      </Panel>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="연구실 정보 구분"
      >
        {["시설 정보", "구성원", "관리대장", "안전 현황"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={t === tab}
            className={`rounded-full border px-4 py-2 text-sm ${t === tab ? "border-brand-700 bg-brand-700 text-white" : "border-gray-200 bg-white text-gray-500"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "시설 정보" && (
        <div className="grid items-start gap-6 md:grid-cols-2">
          <Panel title="시설 기본 정보">
            <dl className="space-y-5 text-sm">
              {[
                ["시설명", state.lab?.name || "미등록"],
                ["시설 코드", state.lab?.code || "미등록"],
                ["위치", state.lab?.location || "미등록"],
                ["설명", state.lab?.description || "미등록"],
                ["신고·허가 상태", "기관 공식 기록 확인 필요"],
              ].map(([k, v]) => (
                <div className="grid grid-cols-[7rem_1fr] gap-3" key={k}>
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium leading-6">{v}</dd>
                </div>
              ))}
            </dl>
            {membersEditable && <form className="mt-6 space-y-3" onSubmit={event => {
              event.preventDefault(); const form = new FormData(event.currentTarget);
              update(value => ({ ...value, lab: { name: String(form.get("labName")).trim(), location: String(form.get("location")).trim(), code: String(form.get("code") || "").trim(), description: String(form.get("description") || "").trim() } }), "연구실 정보를 저장했습니다.");
            }}><Field label="연구실 이름"><input name="labName" className={inputClass} required maxLength={200} defaultValue={state.lab?.name} /></Field><Field label="연구실 위치"><input name="location" className={inputClass} required maxLength={200} defaultValue={state.lab?.location} /></Field><Field label="시설 코드"><input name="code" className={inputClass} maxLength={100} defaultValue={state.lab?.code} /></Field><Field label="연구실 설명"><textarea name="description" className={inputClass} maxLength={2000} defaultValue={state.lab?.description} /></Field><Button type="submit">연구실 정보 저장</Button></form>}
            <ButtonLink href="/mypage/requests?kind=lmo" className="mt-6">
              시설 변경 검토 요청
            </ButtonLink>
          </Panel>
          <Panel title="시설 기록 확인">
            <p className="text-sm leading-7 text-gray-500">
              시설 정보는 내부 관리용 기록입니다. 공식 신고·허가 기록은
              기관 담당자와 공식 시스템에서 확인하세요.
            </p>
            <a
              className="mt-5 inline-block text-sm font-medium text-brand-700"
              href="https://www.lmosafety.or.kr/mps"
              target="_blank"
              rel="noreferrer"
            >
              LMO정보시스템 열기 ↗
            </a>
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm">
              <p className="font-medium">최근 내부 업무</p>
              {state.requests
                .filter((r) => r.kind === "LMO 시설 변경")
                .slice(0, 3)
                .map((r) => (
                  <div
                    className="mt-4 flex flex-wrap justify-between gap-2"
                    key={r.id}
                  >
                    <span className="text-xs text-gray-500">{r.title}</span>
                    <Badge muted>{r.status}</Badge>
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      )}
      {tab === "구성원" && (
        <Panel
          title="구성원 관리"
          aside={
            membersEditable ? (
              <Button onClick={() => setAdding(!adding)}>구성원 추가</Button>
            ) : (
              <Badge muted>담당자 역할에서 관리</Badge>
            )
          }
        >
          {adding && membersEditable && (
            <form
              className="mb-6 grid items-end gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const name = String(form.get("name")).trim();
                if (!name) {
                  notify("구성원 이름을 입력해 주세요.", true);
                  return;
                }
                if (
                  update(
                    (s) => ({
                      ...s,
                      members: [
                        ...s.members,
                        {
                          id: uid(),
                          name,
                          role: String(form.get("role")),
                          active: true,
                        },
                      ],
                    }),
                    "구성원을 추가했습니다.",
                  )
                )
                  setAdding(false);
              }}
            >
              <Field label="구성원 이름">
                <input
                  className={inputClass}
                  name="name"
                  required
                  maxLength={30}
                  placeholder="이름"
                />
              </Field>
              <Field label="구성원 역할">
                <select className={inputClass} name="role">
                  <option>일반 연구원</option>
                  <option>연구실 안전담당자</option>
                  <option>LMO 담당자</option>
                </select>
              </Field>
              <Button type="submit">구성원 저장</Button>
            </form>
          )}
          <div className="divide-y divide-gray-100">
            {state.members.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <span className="text-sm font-semibold">{m.name}</span>
                  <span className="ml-3 text-xs text-gray-500">{m.role}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge muted={!m.active}>
                    {m.active ? "활동 중" : "비활성"}
                  </Badge>
                  {membersEditable && (
                    <button
                      className="text-xs text-gray-500 underline underline-offset-4"
                      onClick={() =>
                        update(
                          (s) => ({
                            ...s,
                            members: s.members.map((row) =>
                              row.id === m.id
                                ? { ...row, active: !row.active }
                                : row,
                            ),
                          }),
                          "구성원 상태를 변경했습니다.",
                        )
                      }
                    >
                      {m.active ? "비활성화" : "복원"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "관리대장" && <LedgerPanel />}
      {tab === "안전 현황" && (
        <Panel title="연구실 안전 현황">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["기록된 점검", state.inspections.length, "건"],
              [
                "미종결 개선조치",
                state.actions.filter((a) => a.status !== "종결").length,
                "건",
              ],
              [
                "미종결 사고 기록",
                state.incidents.filter((i) => i.status !== "종결").length,
                "건",
              ],
            ].map(([label, count, unit]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-5">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-4 text-2xl font-semibold">
                  {count}
                  <span className="ml-1 text-sm font-normal text-gray-400">
                    {unit}
                  </span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/safety/inspections" variant="outline">
              점검·개선조치 확인
            </ButtonLink>
            <ButtonLink href="/safety/incidents" variant="outline">
              사고 기록 확인
            </ButtonLink>
          </div>
        </Panel>
      )}
    </div>
  );
}
