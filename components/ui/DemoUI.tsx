"use client";
import { Button } from "./Button";
import type { FileRef, History } from "@/features/demo/model";
import { timeLabel } from "@/features/demo/model";
import { downloadFile } from "@/features/demo/files";
import { useDemo } from "@/features/demo/Store";
export const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600";
export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 ${className}`}
    >
      {title && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
export function Badge({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${muted ? "bg-gray-100 text-gray-600" : "bg-brand-50 text-brand-700"}`}
    >
      {children}
    </span>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm leading-6 text-gray-500">
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-gray-700">
      <span>{label}</span>
      {children}
      {hint && (
        <span className="block text-xs font-normal text-gray-500">{hint}</span>
      )}
    </label>
  );
}
export function Timeline({ items }: { items: History[] }) {
  return (
    <ol className="space-y-4 border-l border-gray-200 pl-4">
      {items.map((h, i) => (
        <li key={`${h.at}-${i}`}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <strong>{h.event}</strong>
            <span className="text-gray-500">
              {h.actor} · {timeLabel(h.at)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">
            {h.note}
          </p>
        </li>
      ))}
    </ol>
  );
}
export function Attachment({ file }: { file: FileRef }) {
  const { notify } = useDemo();
  return (
    <Button
      variant="outline"
      type="button"
      className="max-w-full text-left"
      onClick={async () => {
        try {
          await downloadFile(file);
        } catch (e) {
          notify((e as Error).message, true);
        }
      }}
    >
      <span className="truncate">첨부 다운로드 · {file.name}</span>
    </Button>
  );
}
export function FileInput({
  onChange,
  required = false,
}: {
  onChange: (file?: File) => void;
  required?: boolean;
}) {
  return (
    <Field
      label="첨부파일"
      hint="PDF, PNG, JPG · 최대 5MB · 이 브라우저에만 저장됩니다."
    >
      <input
        className={inputClass}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        required={required}
        onChange={(e) => onChange(e.target.files?.[0])}
      />
    </Field>
  );
}
