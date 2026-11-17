import type { DemoState, Ledger } from "../demo/model";
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function rebaseDraftChanges(base: DemoState | null, local: DemoState, remote: DemoState): DemoState | null {
  if (!base || !same({ ...base, requestDrafts: undefined }, { ...local, requestDrafts: undefined })) return null;
  const drafts = { ...remote.requestDrafts };
  for (const key of new Set([...Object.keys(base.requestDrafts || {}), ...Object.keys(local.requestDrafts || {})])) {
    const original = base.requestDrafts?.[key], edited = local.requestDrafts?.[key], saved = remote.requestDrafts?.[key];
    if (same(original, edited)) continue;
    if (!same(original, saved) && !same(edited, saved)) return null;
    if (edited) drafts[key] = edited; else delete drafts[key];
  }
  return { ...remote, requestDrafts: drafts };
}

/** Keep edits made during a request, while replacing the metadata acknowledged by the server. */
export function reconcileSavedState(sent: DemoState, confirmed: DemoState, pending: DemoState): DemoState {
  if (same(sent, pending)) return confirmed;
  const next = { ...pending };
  for (const key of ["requests", "actions", "incidents"] as const) {
    Object.assign(next, { [key]: pending[key].map(row => {
      const original = sent[key].find(item => item.id === row.id), saved = confirmed[key].find(item => item.id === row.id);
      if (!original || !saved) return row;
      if (same(original, row)) return saved;
      return { ...row, history: row.history.map((entry, index) => same(entry, original.history[index]) ? saved.history[index] || entry : entry) };
    }) });
  }
  // Daily inspection creates corrective actions on the server, never in a role-dependent client.
  next.actions = [...confirmed.actions.filter(row => !sent.actions.some(item => item.id === row.id) && !next.actions.some(item => item.id === row.id)), ...next.actions];
  next.inspections = pending.inspections.map(row => {
    const original = sent.inspections.find(item => item.id === row.id), saved = confirmed.inspections.find(item => item.id === row.id);
    if (!original || !saved) return row;
    if (same(original, row)) return saved;
    return { ...row, at: saved.at, inspector: saved.inspector, daily: row.daily && saved.daily ? { ...row.daily, inspectorId: saved.daily.inspectorId, history: same(row.daily.history, original.daily?.history) ? saved.daily.history : row.daily.history, confirmation: same(row.daily.confirmation, original.daily?.confirmation) ? saved.daily.confirmation : row.daily.confirmation } : row.daily };
  });
  next.ledger = pending.ledger.map(row => {
    const original = sent.ledger.find(item => item.id === row.id), saved = confirmed.ledger.find(item => item.id === row.id);
    if (!original || !saved) return row;
    if (same(original, row)) return saved;
    const stamp = <T extends Omit<Ledger, "revisions">>(value: T) => ({ ...value, at: saved.at, actor: saved.actor });
    return { ...row, at: saved.at, actor: saved.actor, revisions: row.revisions?.map((entry, i) => same(entry, original.revisions?.[i]) ? saved.revisions?.[i] || entry : { ...entry, before: stamp(entry.before), after: stamp(entry.after) }) };
  });
  return next;
}
