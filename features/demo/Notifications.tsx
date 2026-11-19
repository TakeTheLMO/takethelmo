"use client";
import Link from "next/link";
import { portalHref } from "@/config/workspace";
import { useState } from "react";
import { Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, Empty, Panel } from "@/components/ui/DemoUI";
import { getNotifications, useDemo } from "./Store";
import { AdminActivity } from "../user-management/AdminActivity";
export function Notifications() {
  const { state, update } = useDemo();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const rows = getNotifications(state);
  const read = state.read[state.role] || [];
  const visible = rows.filter((n) => !onlyUnread || !read.includes(n.id));
  const unread = rows.filter((n) => !read.includes(n.id)).length;
  function mark(id: string) {
    update((s) => ({
      ...s,
      read: {
        ...s.read,
        [s.role]: [...new Set([...(s.read[s.role] || []), id])],
      },
    }));
  }
  return (
    <div className="space-y-5">
      <AdminActivity />
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-brand-600" />
            <span className="text-sm font-semibold">읽지 않은 알림</span>
            <Badge>{unread}개</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={onlyUnread}
                onChange={(e) => setOnlyUnread(e.target.checked)}
              />
              읽지 않은 알림만
            </label>
            <Button
              variant="outline"
              disabled={!unread}
              onClick={() =>
                update(
                  (s) => ({
                    ...s,
                    read: { ...s.read, [s.role]: rows.map((n) => n.id) },
                  }),
                  "모든 알림을 읽음으로 표시했습니다.",
                )
              }
            >
              모두 읽음
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          이 브라우저에서 표시되는 알림입니다. 이메일이나 휴대폰 알림은 발송하지
          않습니다.
        </p>
      </Panel>
      <div className="space-y-3">
        {visible.map((n) => (
          <article
            key={n.id}
            className={`flex items-start gap-4 rounded-xl border p-5 ${read.includes(n.id) ? "border-gray-200 bg-white" : "border-brand-100 bg-brand-50/50"}`}
          >
            <span
              className={`mt-2 h-2 w-2 shrink-0 rounded-full ${read.includes(n.id) ? "bg-gray-200" : "bg-brand-600"}`}
              aria-label={read.includes(n.id) ? "읽음" : "읽지 않음"}
            />
            <div className="min-w-0 flex-1">
              <Link
                href={portalHref(n.href)}
                onClick={() => mark(n.id)}
                className="flex items-center justify-between gap-3 text-sm font-semibold"
              >
                <span className="break-words">{n.title}</span>
                <ArrowRight className="shrink-0" size={16} />
              </Link>
              <p className="mt-2 break-words text-xs leading-6 text-gray-500">
                {n.detail}
              </p>
              {!read.includes(n.id) && (
                <button
                  onClick={() => mark(n.id)}
                  className="mt-3 text-xs text-brand-700 underline underline-offset-4"
                >
                  읽음으로 표시
                </button>
              )}
            </div>
          </article>
        ))}
        {!visible.length && <Empty>확인할 알림이 없습니다.</Empty>}
      </div>
    </div>
  );
}
