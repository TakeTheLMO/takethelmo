"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createSeed } from "./data";
import {
  canReview,
  isInquiry,
  requestNeedsReviewer,
  profiles,
  type DemoState,
  type Notification,
} from "./model";
import {
  decodeState,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  validState,
} from "./persistence";
export { STORAGE_KEY } from "./persistence";
type Context = {
  state: DemoState;
  update: (
    change: (state: DemoState) => DemoState,
    message?: string,
  ) => boolean;
  notify: (message: string, error?: boolean) => void;
  reset: () => boolean;
};
const DemoContext = createContext<Context | null>(null);
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(createSeed);
  const current = useRef(state);
  const blocked = useRef(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  function notify(text: string, error = false) {
    setNotice({ text, error });
  }
  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw !== null) {
        const stored = decodeState(raw);
        current.current = stored;
        setState(stored);
      }
    } catch {
      blocked.current = true;
      setNotice({
        text: "저장된 데모 데이터를 읽지 못했습니다. 초기 시나리오를 표시하지만 원본 보호를 위해 저장은 잠겼습니다. 원본을 확인한 뒤 데모 초기화를 선택해 주세요.",
        error: true,
      });
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue !== null) {
        try {
          const value = decodeState(event.newValue);
          blocked.current = false;
          current.current = value;
          setState(value);
        } catch {
          blocked.current = true;
          setNotice({
            text: "다른 탭의 저장 데이터를 읽지 못했습니다. 원본 보호를 위해 저장을 잠갔습니다.",
            error: true,
          });
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function update(
    change: (state: DemoState) => DemoState,
    message?: string,
    recovery = false,
  ) {
    try {
      // storage 이벤트보다 사용자 입력이 먼저 도착한 경우에도 원본을 보호한다.
      const latestRaw =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY);
      if (latestRaw !== null) {
        try {
          decodeState(latestRaw);
        } catch {
          blocked.current = true;
        }
      }
      if (blocked.current && !recovery)
        throw new Error(
          "저장된 원본을 보호하고 있습니다. 원본 확인 후 데모 초기화를 선택해 주세요.",
        );
      if (blocked.current && recovery) {
        const original =
          localStorage.getItem(STORAGE_KEY) ??
          localStorage.getItem(LEGACY_STORAGE_KEY);
        if (original !== null)
          localStorage.setItem(
            `${STORAGE_KEY}:recovery:${Date.now()}`,
            original,
          );
      }
      const next = change(current.current);
      if (!validState(next))
        throw new Error(
          "데모 데이터 형식을 확인해 주세요. 원본은 변경하지 않았습니다.",
        );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      blocked.current = false;
      current.current = next;
      setState(next);
      if (message) notify(message);
      return true;
    } catch (error) {
      notify(
        error instanceof Error && error.name !== "QuotaExceededError"
          ? error.message
          : "저장 공간이 부족합니다. 데모 초기화 또는 브라우저 저장 공간을 확인해 주세요.",
        true,
      );
      return false;
    }
  }
  return (
    <DemoContext.Provider
      value={{
        state,
        update,
        notify,
        reset: () =>
          update(() => createSeed(), "데모 시나리오를 초기화했습니다.", true),
      }}
    >
      {ready ? (
        children
      ) : (
        <div
          className="grid min-h-screen place-items-center text-brand-700"
          role="status"
        >
          데모를 불러오고 있어요…
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
      detail: `예제 기한 ${c.due}`,
      href: "/demo/training",
      target: state.role,
      at: c.due,
    }));
  const actions: Notification[] = state.actions
    .filter((a) => a.owner === state.role && a.status !== "종결")
    .map((a) => ({
      id: `action-${a.id}-${a.status}`,
      title: a.title,
      detail: `${a.status} · 예제 기한 ${a.due}`,
      href: "/demo/inspections",
      target: state.role,
      at: a.due,
    }));
  const reviews: Notification[] = state.requests
    .filter((r) => canReview(state.role, r) && requestNeedsReviewer(r))
    .map((r) => ({
      id: `review-${r.id}-${r.history.length}`,
      title: `${r.title} ${isInquiry(r) ? "답변을 준비해 주세요" : "검토가 필요해요"}`,
      detail: `${r.status} · ${profiles[r.owner].name}의 ${isInquiry(r) ? "사전 문의" : "내부 요청"}`,
      href: "/demo/requests",
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
