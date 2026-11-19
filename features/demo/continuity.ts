import {
  isAdmin,
  profiles,
  type Ledger,
  type Role,
  type RequestDraft,
} from "./model";
import { validateLedger } from "./ledger";
export { assessmentText } from "./assessment-data";
export function latestDraftKind(
  drafts: Record<string, RequestDraft> | undefined,
  role: Role,
) {
  const key = Object.keys(drafts || {})
    .filter((k) => k.startsWith(`${role}:`))
    .sort((a, b) =>
      drafts![b].updatedAt.localeCompare(drafts![a].updatedAt),
    )[0];
  return key?.slice(role.length + 1);
}
export function reviseLedger(
  current: Ledger,
  base: Ledger,
  edited: Ledger,
  role: Role,
  reason: string,
): Ledger {
  if (role !== "lmo_manager" && !isAdmin(role))
    throw new Error("현재 역할은 대장을 정정할 수 없습니다.");
  if (JSON.stringify(current) !== JSON.stringify(base))
    throw new Error(
      "다른 변경이 먼저 저장되었습니다. 정정 화면을 닫고 최신 기록을 다시 열어 주세요.",
    );
  if (!reason.trim()) throw new Error("정정 사유를 입력해 주세요.");
  if (current.format !== edited.format || current.id !== edited.id)
    throw new Error("기록 형식을 바꿀 수 없습니다.");
  if (edited.format === "lmo") validateLedger(edited);
  else if (
    !edited.label.trim() ||
    !edited.unit.trim() ||
    !Number.isFinite(edited.quantity) ||
    edited.quantity < 0
  )
    throw new Error("대상·수량·단위를 확인해 주세요.");
  const before = { ...current };
  delete before.revisions;
  const after = { ...edited, at: current.at, actor: current.actor };
  delete after.revisions;
  if (JSON.stringify(before) === JSON.stringify(after))
    throw new Error("변경된 항목이 없습니다.");
  return {
    ...after,
    revisions: [
      ...(current.revisions || []),
      {
        at: new Date().toISOString(),
        actor: profiles[role].name,
        reason: reason.trim(),
        before,
        after,
      },
    ],
  };
}
