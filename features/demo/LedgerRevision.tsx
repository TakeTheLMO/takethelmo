"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/DemoUI";
import { isAdmin, ledgerUnits, timeLabel, type Ledger } from "./model";
import { reviseLedger } from "./continuity";
import { useDemo } from "./Store";
const labels: Record<string, string> = {
  label: "물질명·대상",
  recordedDate: "기록 일자",
  origin: "취득 경로",
  received: "입고량",
  used: "사용량",
  stored: "보관량",
  quantity: "기존 단일 수량",
  unit: "단위",
  notes: "비고",
  type: "유형",
};
export function LedgerRevision({ record }: { record: Ledger }) {
  const { state, update } = useDemo();
  const [base, setBase] = useState<Ledger | null>(null);
  const editable = state.role === "lmo_manager" || isAdmin(state.role);
  return (
    <div className="mt-4 space-y-4">
      {editable && (
        <Button
          variant="outline"
          onClick={() => setBase(base ? null : structuredClone(record))}
        >
          {base ? "정정 취소" : "기록 정정"}
        </Button>
      )}
      {base && editable && (
        <form
          key={`${base.id}-${state.role}`}
          className="space-y-4 rounded-xl border border-brand-100 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const edited = { ...base };
            const fields =
              base.format === "lmo"
                ? [
                    "label",
                    "recordedDate",
                    "origin",
                    "received",
                    "used",
                    "stored",
                    "unit",
                    "notes",
                  ]
                : ["label", "quantity", "unit", "type"];
            for (const field of fields) {
              const value = String(form.get(field) ?? "");
              Object.assign(edited, {
                [field]: ["received", "used", "stored", "quantity"].includes(
                  field,
                )
                  ? value === ""
                    ? null
                    : Number(value)
                  : value.trim(),
              });
            }
            if (
              update((s) => {
                const current = s.ledger.find((r) => r.id === base.id);
                if (!current) throw new Error("기록을 찾지 못했습니다.");
                const revised = reviseLedger(
                  current,
                  base,
                  edited,
                  s.role,
                  String(form.get("reason") || ""),
                );
                return {
                  ...s,
                  ledger: s.ledger.map((r) => (r.id === base.id ? revised : r)),
                };
              }, "정정 내용과 수정 전후 이력을 저장했습니다.")
            )
              setBase(null);
          }}
        >
          <p className="text-sm text-gray-600">
            원래 기록은 정정 이력에 보존됩니다. 수정할 항목과 사유를 입력하세요.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(base.format === "lmo"
              ? [
                  "label",
                  "recordedDate",
                  "origin",
                  "received",
                  "used",
                  "stored",
                  "unit",
                  "notes",
                ]
              : ["label", "quantity", "unit", "type"]
            ).map((field) => {
              const value = (
                base as unknown as Record<string, string | number | null>
              )[field];
              return (
                <Field key={field} label={`정정 ${labels[field]}`}>
                  {field === "origin" ||
                  (field === "unit" && base.format === "lmo") ? (
                    <select
                      name={field}
                      defaultValue={String(value)}
                      className={inputClass}
                    >
                      {(field === "origin"
                        ? ["확인 필요", "수입", "분양", "자체 제작"]
                        : ledgerUnits
                      ).map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  ) : field === "notes" ? (
                    <textarea
                      name={field}
                      defaultValue={String(value ?? "")}
                      maxLength={2000}
                      className={inputClass}
                    />
                  ) : (
                    <input
                      name={field}
                      defaultValue={value ?? ""}
                      required={[
                        "label",
                        "unit",
                        "quantity",
                        "recordedDate",
                        "type",
                      ].includes(field)}
                      type={
                        ["received", "used", "stored", "quantity"].includes(
                          field,
                        )
                          ? "number"
                          : field === "recordedDate"
                            ? "date"
                            : "text"
                      }
                      min="0"
                      step="any"
                      maxLength={150}
                      className={inputClass}
                    />
                  )}
                </Field>
              );
            })}
          </div>
          <Field label="정정 사유">
            <textarea
              className={inputClass}
              name="reason"
              required
              maxLength={1000}
              rows={2}
            />
          </Field>
          <Button type="submit">정정 저장</Button>
        </form>
      )}
      {!!record.revisions?.length && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-brand-700">
            정정 이력 ({record.revisions.length})
          </summary>
          <ol className="mt-4 space-y-4">
            {record.revisions.map((revision, index) => (
              <li
                key={`${revision.at}-${index}`}
                className="rounded-lg bg-gray-50 p-4 text-sm"
              >
                <p className="font-semibold">
                  {revision.actor} · {timeLabel(revision.at)}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words">
                  사유: {revision.reason}
                </p>
                <dl className="mt-3 space-y-2">
                  {Object.entries(labels)
                    .filter(
                      ([field]) =>
                        JSON.stringify(
                          (
                            revision.before as unknown as Record<
                              string,
                              unknown
                            >
                          )[field],
                        ) !==
                        JSON.stringify(
                          (
                            revision.after as unknown as Record<string, unknown>
                          )[field],
                        ),
                    )
                    .map(([field, label]) => (
                      <div key={field}>
                        <dt className="font-medium">{label}</dt>
                        <dd className="whitespace-pre-wrap break-words text-gray-600">
                          {String(
                            (
                              revision.before as unknown as Record<
                                string,
                                unknown
                              >
                            )[field] ?? "미기재",
                          )}{" "}
                          →{" "}
                          {String(
                            (
                              revision.after as unknown as Record<
                                string,
                                unknown
                              >
                            )[field] ?? "미기재",
                          )}
                        </dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
