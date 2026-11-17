"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { createNotice, updateNotice } from "../actions";
import { NOTICE_BODY_MAX, NOTICE_TITLE_MAX, type FieldErrors, type Notice } from "../schema";

const inputClass = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 aria-[invalid=true]:border-red-500";

export function NoticeForm({
  notice,
  organizations,
  defaultOrganizationId,
}: {
  notice?: Pick<Notice, "id" | "title" | "body" | "is_pinned" | "published_at">;
  /** super_admin 이 여러 기관 중 고를 때만 전달 */
  organizations?: { id: string; name: string }[];
  defaultOrganizationId?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = {
      title: String(form.get("title") ?? ""),
      body: String(form.get("body") ?? ""),
      isPinned: form.get("isPinned") === "on",
      publish: form.get("publish") === "now",
      organizationId: form.get("organizationId") ? String(form.get("organizationId")) : undefined,
    };
    setError(null);
    setFieldErrors({});
    setPending(true);
    try {
      const result = notice ? await updateNotice(notice.id, input) : await createNotice(input);
      if (!result.ok) {
        setError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.push("/admin/notices");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const published = notice ? notice.published_at !== null : true;

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5" noValidate>
      {organizations && organizations.length > 1 && (
        <label className="block text-sm font-medium text-gray-700">
          기관
          <select
            name="organizationId"
            defaultValue={defaultOrganizationId ?? organizations[0]?.id}
            className={inputClass}
            aria-invalid={!!fieldErrors.organizationId}
          >
            {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {fieldErrors.organizationId && <span className="mt-1 block text-sm text-red-600">{fieldErrors.organizationId}</span>}
        </label>
      )}

      <div>
        <label htmlFor="notice-title" className="block text-sm font-medium text-gray-700">
          제목 <span className="text-red-600" aria-hidden>*</span>
        </label>
        <input
          id="notice-title"
          name="title"
          required
          maxLength={NOTICE_TITLE_MAX}
          defaultValue={notice?.title}
          className={inputClass}
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? "notice-title-error" : undefined}
        />
        {fieldErrors.title && <p id="notice-title-error" className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>}
      </div>

      <div>
        <label htmlFor="notice-body" className="block text-sm font-medium text-gray-700">
          본문 <span className="text-red-600" aria-hidden>*</span>
        </label>
        <textarea
          id="notice-body"
          name="body"
          required
          rows={14}
          maxLength={NOTICE_BODY_MAX}
          defaultValue={notice?.body}
          className={inputClass}
          aria-invalid={!!fieldErrors.body}
          aria-describedby={fieldErrors.body ? "notice-body-error notice-body-hint" : "notice-body-hint"}
        />
        <p id="notice-body-hint" className="mt-1 text-xs text-gray-500">
          줄바꿈은 그대로 표시됩니다. 최대 {NOTICE_BODY_MAX.toLocaleString("ko-KR")}자.
        </p>
        {fieldErrors.body && <p id="notice-body-error" className="mt-1 text-sm text-red-600">{fieldErrors.body}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="isPinned" defaultChecked={notice?.is_pinned} className="h-4 w-4 accent-brand-700" />
        목록 상단에 고정
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-gray-700">게시</legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            <input type="radio" name="publish" value="now" defaultChecked={published} className="accent-brand-700" />
            {notice?.published_at ? "게시 유지" : "즉시 게시"}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="publish" value="draft" defaultChecked={!published} className="accent-brand-700" />
            임시저장 (사용자에게 보이지 않음)
          </label>
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "저장 중" : "저장"}</Button>
        <ButtonLink href="/admin/notices" variant="outline">취소</ButtonLink>
      </div>
    </form>
  );
}
