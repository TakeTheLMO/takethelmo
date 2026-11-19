import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Row, Sql } from "./sql";

// 로컬 개발·단위 테스트용. 서버리스 배포에서는 파일을 쓸 수 없으므로 ./postgres 를 쓴다.
export class SqliteSql implements Sql {
  private busy: Promise<void> = Promise.resolve();
  constructor(readonly raw: DatabaseSync, private readonly inTx = false) {}
  private async ready() { if (!this.inTx) await this.busy; }
  async get(sql: string, ...params: unknown[]) { await this.ready(); return this.raw.prepare(sql).get(...(params as SQLInputValue[])) as Row | undefined; }
  async all(sql: string, ...params: unknown[]) { await this.ready(); return this.raw.prepare(sql).all(...(params as SQLInputValue[])) as Row[]; }
  async run(sql: string, ...params: unknown[]) { await this.ready(); this.raw.prepare(sql).run(...(params as SQLInputValue[])); }
  async tx<T>(_lock: string, fn: (db: Sql) => Promise<T>): Promise<T> {
    if (this.inTx) return fn(this);
    const previous = this.busy;
    let release!: () => void;
    this.busy = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      this.raw.exec("BEGIN IMMEDIATE");
      try { const result = await fn(new SqliteSql(this.raw, true)); this.raw.exec("COMMIT"); return result; }
      catch (error) { this.raw.exec("ROLLBACK"); throw error; }
    } finally { release(); }
  }
  async close() { if (this.raw.isOpen) this.raw.close(); }
}

export function createSqlite(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS local_users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, salt TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS local_sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES local_users(id), expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS local_auth_attempts (
      key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL
    );`);
  const columns = db.prepare("PRAGMA table_info(local_users)").all().map(row => row.name);
  if (!columns.includes("username")) db.exec("ALTER TABLE local_users ADD COLUMN username TEXT");
  if (!columns.includes("role")) db.exec("ALTER TABLE local_users ADD COLUMN role TEXT NOT NULL DEFAULT 'researcher'");
  if (!columns.includes("position")) db.exec("ALTER TABLE local_users ADD COLUMN position TEXT NOT NULL DEFAULT '연구원'");
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS local_users_username ON local_users(username);
    CREATE TABLE IF NOT EXISTS account_data(user_id TEXT PRIMARY KEY REFERENCES local_users(id),state TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS account_files(id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES local_users(id),name TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,body BLOB NOT NULL,PRIMARY KEY(user_id,id));
    CREATE TABLE IF NOT EXISTS account_activity(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES local_users(id),actor_id TEXT NOT NULL REFERENCES local_users(id),kind TEXT NOT NULL,title TEXT NOT NULL,at TEXT NOT NULL,read_at TEXT,before_value TEXT,after_value TEXT,reason TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS account_notes(user_id TEXT PRIMARY KEY REFERENCES local_users(id),note TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS portal_content(path TEXT PRIMARY KEY,document TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS portal_content_history(id TEXT PRIMARY KEY,path TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES local_users(id),at TEXT NOT NULL,reason TEXT NOT NULL,before_value TEXT NOT NULL,after_value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS portal_files(id TEXT PRIMARY KEY,name TEXT NOT NULL,type TEXT NOT NULL,body BLOB NOT NULL,size INTEGER NOT NULL,actor_id TEXT NOT NULL REFERENCES local_users(id));`);
  return new SqliteSql(db);
}
