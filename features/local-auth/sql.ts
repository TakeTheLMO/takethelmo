// 포털 계정 저장소가 쓰는 최소 SQL 인터페이스.
// 로컬·테스트는 SQLite(./sqlite), 배포(Vercel 등 서버리스)는 Supabase Postgres(./postgres) 구현을 쓴다.
// SQL 은 두 DB 에서 모두 동작하는 문법만 사용한다: `?` 자리표시자, ON CONFLICT, 별칭은 "camelCase" 처럼 큰따옴표.
export type Row = Record<string, unknown>;

export interface Sql {
  get(sql: string, ...params: unknown[]): Promise<Row | undefined>;
  all(sql: string, ...params: unknown[]): Promise<Row[]>;
  run(sql: string, ...params: unknown[]): Promise<void>;
  /** 쓰기 트랜잭션. 같은 lock 키끼리는 직렬화된다 (SQLite 는 전체 직렬화). */
  tx<T>(lock: string, fn: (db: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function isUniqueViolation(error: unknown) {
  return (error as { code?: string } | null)?.code === "23505" || /UNIQUE|duplicate key/i.test(String(error));
}
