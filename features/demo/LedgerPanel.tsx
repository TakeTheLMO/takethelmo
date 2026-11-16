"use client";
import { useState } from "react";
import { Badge, Empty, Field, inputClass, Panel } from "@/components/ui/DemoUI";
import { Button } from "@/components/ui/Button";
import {
  isAdmin,
  ledgerUnits,
  profiles,
  timeLabel,
  uid,
  type LmoLedger,
} from "./model";
import { useDemo } from "./Store";
import { downloadBlob } from "./files";
import { LedgerGuidance } from "./Guidance";
import { LedgerRevision } from "./LedgerRevision";
import { ledgerCsv, validateLedger } from "./ledger";

export function LedgerPanel() {
  const { state, update, notify } = useDemo();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<LmoLedger["origin"]>("확인 필요");
  const editable = state.role === "lmo_manager" || isAdmin(state.role);
  const today = new Date();
  const defaultDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return (
    <div className="space-y-6">
      <LedgerGuidance />
      <Panel
        title="LMO 관리기록"
        aside={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadBlob(
                  new Blob(["\uFEFF", ledgerCsv(state.ledger)], {
                    type: "text/csv;charset=utf-8",
                  }),
                  "가상_LMO_관리대장.csv",
                )
              }
            >
              CSV 다운로드
            </Button>
            {editable && (
              <Button
                onClick={() => {
                  if (!open) setOrigin("확인 필요");
                  setOpen(!open);
                }}
                aria-expanded={open}
              >
                {open ? "작성 닫기" : "기록 추가"}
              </Button>
            )}
          </div>
        }
      >
        <p className="mb-5 text-sm leading-6 text-gray-500">
          브라우저에 저장하는 작성 체험입니다. 입력은 LMO 담당자·관리자 역할에서
          가능합니다. 실제 기관의 작성 권한과 전자기록 인정 여부는 확인이
          필요합니다.
        </p>
        {open && editable && (
          <form
            className="mb-6 space-y-5 rounded-xl border border-brand-100 bg-brand-50/30 p-4 sm:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const amount = (name: string) =>
                String(form.get(name) ?? "").trim() === ""
                  ? null
                  : Number(form.get(name));
              const record: LmoLedger = {
                id: uid(),
                format: "lmo",
                type: "LMO 취급·관리",
                origin,
                recordedDate: String(form.get("recordedDate")),
                label: String(form.get("label")).trim(),
                received: amount("received"),
                used: amount("used"),
                stored: amount("stored"),
                unit: String(form.get("unit")) as LmoLedger["unit"],
                notes: String(form.get("notes")).trim(),
                at: new Date().toISOString(),
                actor: profiles[state.role].name,
              };
              try {
                validateLedger(record);
              } catch (error) {
                notify((error as Error).message, true);
                return;
              }
              if (
                update((s) => {
                  if (s.role !== "lmo_manager" && !isAdmin(s.role))
                    throw new Error(
                      "현재 역할은 관리기록을 추가할 수 없습니다.",
                    );
                  return { ...s, ledger: [record, ...s.ledger] };
                }, "관리기록을 저장했습니다.")
              )
                setOpen(false);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="기록 일자">
                <input
                  className={inputClass}
                  type="date"
                  name="recordedDate"
                  required
                  defaultValue={defaultDate}
                />
              </Field>
              <Field label="취득 경로">
                <select
                  className={inputClass}
                  value={origin}
                  onChange={(e) =>
                    setOrigin(e.target.value as LmoLedger["origin"])
                  }
                >
                  {["확인 필요", "수입", "분양", "자체 제작"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="물질명"
              hint={
                origin === "수입"
                  ? "수입신고확인서에 적힌 명칭과 대조해 입력하세요. 연구실 호칭·제품명 병기는 비고 사용 여부를 기관에 확인하세요."
                  : "분양·자체 제작 등 수입하지 않은 물질의 명칭 기준은 기관 서식·담당자 확인이 필요합니다."
              }
            >
              <input
                className={inputClass}
                name="label"
                required
                maxLength={150}
                placeholder="확인한 자료의 명칭"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["received", "입고량"],
                ["used", "사용량"],
                ["stored", "보관량"],
              ].map(([name, label]) => (
                <Field key={name} label={label}>
                  <input
                    className={inputClass}
                    name={name}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="미기재"
                  />
                </Field>
              ))}
              <Field label="수량 단위">
                <select name="unit" className={inputClass}>
                  {ledgerUnits.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="text-xs leading-6 text-gray-600">
              세 수량은 선택한 동일 단위로 저장합니다 (팀 제안). 미기재와 0은
              구분됩니다. 해당하지 않는 칸의 기재 방식과 기본 단위는 기관에
              확인하세요. 배양 등 수량 변동 사유가 있으면 작성 기준을 확인해
              비고에 기재하세요.
            </p>
            <Field
              label="비고"
              hint="팀 제안: 용기 수를 선택했다면 용기당 용량을 함께 적으세요. 예: 1 vial당 1 ml. 기관 기준 확인 필요."
            >
              <textarea
                name="notes"
                className={inputClass}
                rows={3}
                maxLength={2000}
                placeholder="수량 변동 사유, 확인할 사항 등"
              />
            </Field>
            <Button type="submit">관리기록 저장</Button>
          </form>
        )}
        <div className="space-y-3">
          {state.ledger.map((record) => (
            <article
              key={record.id}
              className="rounded-xl border border-gray-200 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge muted>
                    {record.format === "lmo"
                      ? `${record.origin} · 작성 체험`
                      : "기존 단순 기록"}
                  </Badge>
                  <h3 className="mt-3 break-words text-sm font-semibold">
                    {record.label}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    저장 {timeLabel(record.at)} · {record.actor}
                  </p>
                </div>
                {record.format !== "lmo" && (
                  <p className="text-sm font-semibold">
                    {record.quantity} {record.unit}
                  </p>
                )}
              </div>
              {record.format === "lmo" ? (
                <>
                  <p className="mt-3 text-xs text-gray-500">
                    기록 일자 {record.recordedDate}
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3">
                    {[
                      ["입고량", record.received],
                      ["사용량", record.used],
                      ["보관량", record.stored],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-gray-500">{label}</dt>
                        <dd className="mt-1 break-words text-sm font-semibold">
                          {value === null
                            ? "미기재"
                            : `${value} ${record.unit}`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                    비고: {record.notes || "미기재"}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs leading-6 text-gray-500">
                  이전 버전의 {record.type} 기록입니다. 기존 수량을
                  입고량·사용량·보관량으로 임의 변환하지 않았습니다.
                </p>
              )}
              <LedgerRevision record={record} />
            </article>
          ))}
          {!state.ledger.length && <Empty>등록된 관리기록이 없습니다.</Empty>}
        </div>
      </Panel>
    </div>
  );
}
