import type { DemoState } from "../demo/model";
type BackupStorage = Pick<Storage, "getItem" | "setItem" | "key" | "length">;
const prefixFor = (key: string) => `${key}:conflict-history:`;
export function recoveryCopies(storage: BackupStorage, key: string) {
  const prefix = prefixFor(key), copies: { savedAt: string; state: unknown }[] = [];
  for (let i = 0; i < storage.length; i++) {
    const name = storage.key(i);
    if (!name?.startsWith(prefix)) continue;
    const raw = storage.getItem(name);
    if (raw) { try { copies.push({ savedAt: name.slice(prefix.length, prefix.length + 24), state: JSON.parse(raw) }); } catch { /* Preserve a damaged browser value without importing it. */ } }
  }
  const latest = storage.getItem(`${key}:conflict-backup`);
  if (latest && !copies.some(row => JSON.stringify(row.state) === latest)) { try { copies.push({ savedAt: "이전 복구 사본", state: JSON.parse(latest) }); } catch { /* Not a readable copy. */ } }
  return copies.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
export function saveRecoveryCopy(storage: BackupStorage, key: string, state: DemoState) {
  const previous = storage.getItem(`${key}:conflict-backup`), stamp = new Date().toISOString();
  if (previous && !recoveryCopies(storage, key).some(row => row.savedAt !== "이전 복구 사본" && JSON.stringify(row.state) === previous)) storage.setItem(`${prefixFor(key)}${stamp}:${crypto.randomUUID()}`, previous);
  const raw = JSON.stringify(state);
  storage.setItem(`${prefixFor(key)}${stamp}:${crypto.randomUUID()}`, raw);
  storage.setItem(`${key}:conflict-backup`, raw);
}
