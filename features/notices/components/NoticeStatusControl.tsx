"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { setNoticeStatus } from "../actions";

// 게시중단 / 다시 게시. 브라우저 confirm 대신 페이지 안에서 한 번 더 확인한다 (명세 4).
export function NoticeStatusControl({ id, status }: { id: string; status: "active" | "inactive" | string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = status === "active";

  async function apply() {
    setError(null);
    setPending(true);
    try {
      const result = await setNoticeStatus(id, active ? "inactive" : "active");
      if (!result.ok) return setError(result.message);
      setConfirming(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <h2 className="text-base font-semibold text-gray-900">{active ? "게시중단" : "다시 게시"}</h2>
      <p className="mt-1 text-sm text-gray-600">
        {active
          ? "게시중단하면 사용자 화면에서 보이지 않습니다. 기록은 삭제되지 않으며 언제든 다시 게시할 수 있습니다."
          : "이 공지는 게시중단 상태입니다. 다시 게시하면 사용자 화면에 보입니다."}
      </p>
      {!confirming ? (
        <Button type="button" variant="outline" className="mt-4" onClick={() => setConfirming(true)}>
          {active ? "게시중단" : "다시 게시"}
        </Button>
      ) : (
        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4" role="group" aria-label="확인">
          <p className="text-sm font-medium text-gray-900">
            {active ? "이 공지를 게시중단할까요?" : "이 공지를 다시 게시할까요?"}
          </p>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={apply} disabled={pending}>{pending ? "처리 중" : "확인"}</Button>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>취소</Button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
    </Card>
  );
}
