"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { emptyWorkspace, prepareWorkspaceState, stampWorkspaceActors } from "../workspace/state";
import { validState } from "./validation";
import { useAccountSync } from "../user-management/useAccountSync";
import type { LocalUser } from "../local-auth/database";

import {
  canReview,
  profiles,
  type DemoState,
  type Notification,
} from "./model";
export const STORAGE_KEY = "takethelmo:frontend-demo:v1";
type Context = {
  user: LocalUser;
  storageScope: string;
  syncStatus: string;
  retrySync: () => void;
  hasBackup: boolean;
  state: DemoState;
  update: (
    change: (state: DemoState) => DemoState,
    message?: string,
  ) => boolean;
  notify: (message: string, error?: boolean) => void;
  reset: () => boolean;
};
const DemoContext = createContext<Context | null>(null);
export function DemoProvider({ children, user }: { children: React.ReactNode; user: LocalUser }) {
  const storageScope = user.id;
  const storageKey = `${STORAGE_KEY}:user:${user.id}`;
  const [state, setState] = useState<DemoState>(() => emptyWorkspace(user.role));
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  function notify(text: string, error = false) {
    setNotice({ text, error });
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const stored: unknown = JSON.parse(raw);
        if (!validState(stored)) throw new Error("invalid");
        const restored = prepareWorkspaceState(user, stored);
        current.current = restored;
        setState(restored);
      }
    } catch {
      setNotice({
        text: "브라우저 저장 자료를 읽지 못했습니다. 서버 자료를 확인합니다. 변경 전 브라우저 저장 설정을 확인해 주세요.",
        error: true,
      });
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        try {
          const value: unknown = JSON.parse(event.newValue);
          if (validState(value)) {
            const synced = prepareWorkspaceState(user, value);
            current.current = synced;
            setState(synced);
          }
        } catch {
          /* 다른 탭의 불완전한 값은 사용하지 않는다. */
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey, user]);
  const { syncReady, syncStatus, syncChanged, retrySync, hasBackup } = useAccountSync(user, storageKey, current, setState);
  function update(change: (state: DemoState) => DemoState, message?: string) {
    try {
      const next = stampWorkspaceActors(current.current, prepareWorkspaceState(user, change(current.current)), user);
      localStorage.setItem(storageKey, JSON.stringify(next));
      current.current = next;
      setState(next);
      syncChanged();
      if (message) notify(message);
      return true;
    } catch (error) {
      notify(
        error instanceof Error && error.name !== "QuotaExceededError"
          ? error.message
          : "저장 공간이 부족합니다. 브라우저 저장 공간을 확인해 주세요.",
        true,
      );
      return false;
    }
  }
  return (
    <DemoContext.Provider
      value={{
        user,
        storageScope,
        syncStatus,
        retrySync,
        hasBackup,
        state,
        update,
        notify,
        reset: () =>
          update(() => emptyWorkspace(user.role), "업무 자료를 초기화했습니다."),
      }}
    >
      {ready && syncReady ? (
        children
      ) : (
        <div
          className="grid min-h-screen place-items-center text-brand-700"
          role="status"
        >
          업무 자료를 불러오고 있어요…
        </div>
      )}
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className="fixed bottom-5 left-4 right-4 z-50 mx-auto flex max-w-xl items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-900 p-4 text-sm text-white shadow-lg"
        >
          <span>{notice.text}</span>
          <button
            aria-label="메시지 닫기"
            className="shrink-0 px-2"
            onClick={() => setNotice(null)}
          >
            ✕
          </button>
        </div>
      )}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("DemoProvider가 필요합니다.");
  return context;
}
export function pushNotification(
  state: DemoState,
  notification: Omit<Notification, "id" | "at">,
): DemoState {
  return {
    ...state,
    notifications: [
      {
        ...notification,
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
      },
      ...state.notifications,
    ],
  };
}
export function getNotifications(state: DemoState) {
  const courses: Notification[] = state.courses
    .filter(
      (c) =>
        !state.enrollments.some(
          (e) =>
            e.owner === state.role &&
            e.courseId === c.id &&
            e.status === "등록 완료",
        ),
    )
    .map((c) => ({
      id: `course-${state.role}-${c.id}`,
      title: `${c.title} 이수증을 등록해 주세요`,
      detail: c.due ? `관리 기한 ${c.due}` : "기한 미지정",
      href: "/training/courses",
      target: state.role,
      at: c.due,
    }));
  const actions: Notification[] = state.actions
    .filter((a) => a.owner === state.role && a.status !== "종결")
    .map((a) => ({
      id: `action-${a.id}-${a.status}`,
      title: a.title,
      detail: `${a.status} · 관리 기한 ${a.due}`,
      href: "/safety/inspections",
      target: state.role,
      at: a.due,
    }));
  const reviews: Notification[] = state.requests
    .filter(
      (r) => canReview(state.role, r) && ["제출", "검토 중"].includes(r.status),
    )
    .map((r) => ({
      id: `review-${r.id}-${r.history.length}`,
      title: `${r.title} 검토가 필요해요`,
      detail: `${r.status} · ${r.history[0]?.actor || profiles[r.owner].label}의 내부 요청`,
      href: "/mypage/requests",
      target: state.role,
      at: r.history[r.history.length - 1].at,
    }));
  return [
    ...state.notifications.filter(
      (n) => n.target === "all" || n.target === state.role,
    ),
    ...actions,
    ...reviews,
    ...courses,
  ];
}
