import { ledgerUnits, type Ledger, type LmoLedger } from "./model";

export function validateLedger(record: LmoLedger) {
  if ([record.storageLocation, record.containerCapacity].some(value => value !== undefined && (typeof value !== "string" || value.length > 150))) throw new Error("보관 위치와 용기당 용량은 150자 이내로 입력해 주세요.");
  if (!record.label.trim()) throw new Error("물질명을 입력해 주세요.");
  if (!ledgerUnits.includes(record.unit))
    throw new Error("수량 단위를 선택해 주세요.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(record.recordedDate) ||
    !Number.isFinite(Date.parse(record.recordedDate))
  )
    throw new Error("기록 일자를 확인해 주세요.");
  const amounts = [record.received, record.used, record.stored];
  if (amounts.every((n) => n === null))
    throw new Error("입고량·사용량·보관량 중 한 항목 이상 입력해 주세요.");
  if (amounts.some((n) => n !== null && (!Number.isFinite(n) || n < 0)))
    throw new Error("수량은 0 이상의 숫자로 입력해 주세요.");
  // 배양 등 실제 변동 사유를 임의의 수량 등식으로 거부하지 않는다.
}

export function ledgerCsv(records: Ledger[]) {
  const escape = (value: string | number | null) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    [
      "기록 구분",
      "저장 일시",
      "기록 일자",
      "취득 경로",
      "유형",
      "물질명·대상",
      "입고량",
      "사용량",
      "보관량",
      "단위",
      "비고",
      "기록자",
      "기존 단일 수량",
      "보관 위치",
      "용기당 용량 (수량과 별도)",
    ],
    ...records.map((r) =>
      r.format === "lmo"
        ? [
            "LMO 내부 관리기록",
            r.at,
            r.recordedDate,
            r.origin,
            r.type,
            r.label,
            r.received,
            r.used,
            r.stored,
            r.unit,
            r.notes,
            r.actor,
            "",
            r.storageLocation || "",
            r.containerCapacity || "",
          ]
        : [
            "기존 단순 기록",
            r.at,
            "",
            "",
            r.type,
            r.label,
            "",
            "",
            "",
            r.unit,
            "기존 수량의 의미를 임의로 변환하지 않음",
            r.actor,
            r.quantity,
            "",
            "",
          ],
    ),
  ]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}
