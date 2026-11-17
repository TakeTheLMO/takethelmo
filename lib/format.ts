// 화면 표시용 날짜 형식. 서버·클라이언트 시간대와 무관하게 항상 한국 시간 기준.
const dateParts = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026.11.03" */
export function formatDate(value: string | Date): string {
  const parts = dateParts.formatToParts(new Date(value));
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

/** URL 쿼리의 page 값을 1 이상의 정수로. 잘못된 값은 1. */
export function parsePage(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}

/** LIKE/ILIKE 패턴 특수문자(%, _, \) 이스케이프 */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
