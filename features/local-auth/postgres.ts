import "server-only";
import postgres from "postgres";
import type { Row, Sql } from "./sql";

// 배포용: Supabase Postgres (supabase/migrations/0004_portal_store.sql).
// PORTAL_DATABASE_URL 은 서버 전용 비밀값이다. Supavisor 트랜잭션 풀러(6543)를 쓰므로 prepared statement 를 끈다.
const placeholders = (sql: string) => { let index = 0; return sql.replace(/\?/g, () => `$${++index}`); };
type Client = postgres.Sql | postgres.TransactionSql;

class PostgresSql implements Sql {
  constructor(private readonly client: Client, private readonly inTx = false) {}
  async all(sql: string, ...params: unknown[]) {
    return [...await this.client.unsafe(placeholders(sql), params as postgres.ParameterOrJSON<never>[])] as Row[];
  }
  async get(sql: string, ...params: unknown[]) { return (await this.all(sql, ...params))[0]; }
  async run(sql: string, ...params: unknown[]) { await this.all(sql, ...params); }
  async tx<T>(lock: string, fn: (db: Sql) => Promise<T>): Promise<T> {
    if (this.inTx) return fn(this);
    return await (this.client as postgres.Sql).begin(async tx => {
      await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [lock]);
      return fn(new PostgresSql(tx, true));
    }) as T;
  }
  async close() { if (!this.inTx) await (this.client as postgres.Sql).end(); }
}

export function createPostgres(url: string): Sql {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return new PostgresSql(postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10, ssl: local ? false : "require" }));
}
