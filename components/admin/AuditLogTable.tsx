import type { AuditLogRow } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState";

const fmt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" });
const short = (id: string | null) => (id ? id.slice(0, 8) : "-");

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  if (rows.length === 0) return <EmptyState message="조회할 수 있는 감사로그가 없습니다." />;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {["시각", "작업", "행위자", "역할", "대상"].map((h) => (
              <th key={h} scope="col" className="px-4 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-2 text-gray-600">{fmt.format(new Date(r.created_at))}</td>
              <td className="px-4 py-2 font-medium">{r.action}</td>
              <td className="px-4 py-2 font-mono text-xs text-gray-600">{short(r.actor_id)}</td>
              <td className="px-4 py-2 text-gray-600">{r.actor_role ?? "시스템"}</td>
              <td className="px-4 py-2 text-gray-600">{r.target_table ? `${r.target_table} ${short(r.target_id)}` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
