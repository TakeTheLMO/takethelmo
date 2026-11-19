"use client";
import { useEffect, useRef, useState } from "react";
import type { LocalUser } from "../local-auth/database";
import type { DemoState } from "../demo/model";
import { validState } from "../demo/validation";
import { prepareWorkspaceState } from "../workspace/state";
import { migrateFiles } from "../demo/files";
import { reconcileSavedState, rebaseDraftChanges } from "./reconcile";
import { recoveryCopies, saveRecoveryCopy } from "./recovery";
export function useAccountSync(user: LocalUser, storageKey: string,
  current: React.RefObject<DemoState>, setState: (state: DemoState) => void,
) {
  const [syncStatus, setSyncStatus] = useState("서버 연결 중");
  const revision = useRef(0), pending = useRef(false), running = useRef(false), initialized = useRef(false);
  const [syncReady, setSyncReady] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const filesMigrated = useRef(false);
  const blocked = useRef(false);
  const confirmedState = useRef<DemoState | null>(null);
  const receive = useRef((state: DemoState) => {
    const next = prepareWorkspaceState(user, state);
    localStorage.setItem(storageKey, JSON.stringify(next)); current.current = next; setState(next);
  });
  receive.current = state => {
    const next = prepareWorkspaceState(user, state);
    localStorage.setItem(storageKey, JSON.stringify(next)); current.current = next; setState(next);
  };
  const flush = useRef(async () => {});
  flush.current = async () => {
    if (!initialized.current || running.current || !pending.current || blocked.current) return;
    running.current = true;
    try {
      let rebases = 0;
      if (!filesMigrated.current) { await migrateFiles(current.current, user.id); filesMigrated.current = true; }
      while (pending.current) {
        const sent = current.current;
        setSyncStatus("서버 저장 중");
        const response = await fetch("/api/account-data", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", state: sent, revision: revision.current }) });
        const result = await response.json();
        if (response.status === 409) {
          const latest = await fetch("/api/account-data", { cache: "no-store" }).then(r => r.json());
          if (!validState(latest.state)) throw new Error();
          const normalized = prepareWorkspaceState(user, latest.state);
          const rebased = rebases < 2 ? rebaseDraftChanges(confirmedState.current, current.current, normalized) : null;
          confirmedState.current = normalized;
          if (rebased) {
            rebases++; receive.current(rebased); revision.current = latest.revision;
            localStorage.setItem(`${storageKey}:pending`, String(revision.current));
            continue;
          }
          // Capture even input typed while the GET was in flight, immediately before replacing it.
          saveRecoveryCopy(localStorage, storageKey, current.current); setHasBackup(true);
          receive.current(normalized); revision.current = latest.revision;
          pending.current = false; localStorage.removeItem(`${storageKey}:pending`);
          setSyncStatus("다른 변경을 불러왔습니다. 저장 전 입력은 복구 사본에 보관했습니다.");
          return;
        }
        if (!response.ok) throw new Error(result.message);
        if (validState(result.state)) confirmedState.current = prepareWorkspaceState(user, result.state);
        revision.current = result.revision;
        if (sent === current.current) {
          if (validState(result.state)) receive.current(result.state);
          pending.current = false; localStorage.removeItem(`${storageKey}:pending`);
        } else {
          if (validState(result.state)) receive.current(reconcileSavedState(sent, result.state, current.current));
          localStorage.setItem(`${storageKey}:pending`, String(revision.current));
        }
      }
      setSyncStatus("서버 저장 완료");
    } catch (error) {
      if (error instanceof Error && error.name === "QuotaExceededError") {
        blocked.current = true;
        setSyncStatus("서버 저장 실패 · 복구 사본 공간 부족. 현재 입력을 다운로드한 뒤 저장을 다시 시도해 주세요.");
      } else setSyncStatus(`서버 저장 실패 · 브라우저 입력 유지${error instanceof Error && error.message ? ` (${error.message})` : ""}`);
    }
    finally { running.current = false; }
  };
  useEffect(() => {
    let live = true;
    async function load(initial = false) {
      if (blocked.current || running.current || (!initial && (pending.current || localStorage.getItem(`${storageKey}:pending`)))) return;
      const requestedState = current.current;
      try {
        setHasBackup(recoveryCopies(localStorage, storageKey).length > 0);
        const response = await fetch("/api/account-data", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const snapshot = await response.json();
        if (!live || current.current !== requestedState || (!initial && (pending.current || running.current))) return;
        const dirty = localStorage.getItem(`${storageKey}:pending`);
        revision.current = snapshot.revision;
        if (validState(snapshot.state)) confirmedState.current = prepareWorkspaceState(user, snapshot.state);
        if (initial && dirty) {
          // Do not overwrite remote admin edits with an offline snapshot.
          const savedVersion = Number(dirty);
          if (savedVersion !== snapshot.revision && snapshot.state) {
            saveRecoveryCopy(localStorage, storageKey, current.current);
            setHasBackup(true);
            receive.current(snapshot.state); localStorage.removeItem(`${storageKey}:pending`);
            setSyncStatus("다른 변경을 불러왔습니다. 저장 전 입력은 복구 사본에 보관했습니다.");
          } else pending.current = true;
        } else if (snapshot.state && validState(snapshot.state)) {
          const normalized = prepareWorkspaceState(user, snapshot.state);
          receive.current(normalized);
          if (JSON.stringify(normalized) !== JSON.stringify(snapshot.state)) pending.current = true;
          setSyncStatus("서버 저장 완료");
        } else if (initial) pending.current = true;
        initialized.current = true;
        if (initial) { await migrateFiles(current.current, user.id); filesMigrated.current = true; }
        if (pending.current) { localStorage.setItem(`${storageKey}:pending`, String(revision.current)); void flush.current(); }
      } catch (error) {
        if (initialized.current && !filesMigrated.current) { pending.current = true; localStorage.setItem(`${storageKey}:pending`, String(revision.current)); }
        if (error instanceof Error && error.name === "QuotaExceededError") { blocked.current = true; setSyncStatus("서버 연결 실패 · 복구 사본 공간 부족. 현재 입력을 다운로드해 주세요."); }
        else setSyncStatus("서버 연결 실패 · 브라우저 입력 유지");
      }
      finally { if (live) setSyncReady(true); }
    }
    // The Store restores browser data in its earlier effect first.
    void load(true);
    const timer = setInterval(() => { if (pending.current) void flush.current(); else void load(); }, 10000);
    const focus = () => { if (!initialized.current) void load(true); else if (pending.current) void flush.current(); else void load(); };
    addEventListener("focus", focus);
    return () => { live = false; clearInterval(timer); removeEventListener("focus", focus); };
  }, [storageKey, user, current]);
  return { syncReady, syncStatus, hasBackup, syncChanged: () => {
    localStorage.setItem(`${storageKey}:pending`, String(revision.current)); pending.current = true; void flush.current();
  }, retrySync: () => { blocked.current = false; if (initialized.current) void flush.current(); else location.reload(); } };
}
