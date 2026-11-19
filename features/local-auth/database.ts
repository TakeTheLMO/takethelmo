import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { validateRole, validateSignupRole, type AccountRole } from "./profile";

export type LocalUser = { id: string; email: string; name: string; role: AccountRole; canSwitchRole: boolean };
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const derive = (password: string, salt: string) => scryptSync(password, salt, 64);

export class LocalAuthStore {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
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
    const columns = this.db.prepare("PRAGMA table_info(local_users)").all().map(row => row.name);
    if (!columns.includes("username")) this.db.exec("ALTER TABLE local_users ADD COLUMN username TEXT");
    if (!columns.includes("role")) this.db.exec("ALTER TABLE local_users ADD COLUMN role TEXT NOT NULL DEFAULT 'researcher'");
    if (!columns.includes("position")) this.db.exec("ALTER TABLE local_users ADD COLUMN position TEXT NOT NULL DEFAULT '연구원'");
    this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS local_users_username ON local_users(username)");
  }
  ensureAdmin() {
    const salt = randomBytes(16).toString("hex");
    this.db.prepare(`INSERT OR IGNORE INTO local_users(id,email,name,password_hash,salt,username,role,position)
      VALUES (?,?,?,?,?,'admin','super_admin','시스템 관리자')`)
      .run(randomUUID(), "admin@prototype.local", "관리자", derive("admin", salt).toString("hex"), salt);
  }
  attempt(key: string, limit = 10) {
    const now = Date.now();
    this.db.prepare("DELETE FROM local_auth_attempts WHERE reset_at <= ?").run(now);
    const hashed = digest(key);
    this.db.prepare(`INSERT INTO local_auth_attempts(key,count,reset_at) VALUES (?,1,?)
      ON CONFLICT(key) DO UPDATE SET count=count+1`).run(hashed, now + 15 * 60_000);
    const row = this.db.prepare("SELECT count FROM local_auth_attempts WHERE key=?").get(hashed)!;
    if (Number(row.count) > limit) throw new Error("요청이 너무 많습니다. 15분 후 다시 시도해 주세요.");
  }
  register(name: string, email: string, password: string, role = "researcher"): LocalUser {
    name = name.trim(); email = email.trim().toLowerCase();
    if (email.startsWith("sample.") && email.endsWith("@example.test")) throw new Error("예시 데이터 전용 주소는 가입할 수 없습니다.");
    if (name.length < 2 || name.length > 40) throw new Error("이름은 2~40자로 입력해 주세요.");
    if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("이메일을 확인해 주세요.");
    if (password.length < 8 || password.length > 128) throw new Error("비밀번호는 8~128자로 입력해 주세요.");
    const salt = randomBytes(16).toString("hex");
    const user = { id: randomUUID(), email, name, role: validateSignupRole(role), canSwitchRole: false };
    try {
      this.db.prepare("INSERT INTO local_users(id,email,name,password_hash,salt,role) VALUES (?,?,?,?,?,?)")
        .run(user.id, email, name, derive(password, salt).toString("hex"), salt, user.role);
    } catch (error) {
      if (String(error).includes("UNIQUE")) throw new Error("이미 등록된 이메일입니다. 로그인해 주세요.");
      throw error;
    }
    return user;
  }
  login(email: string, password: string): LocalUser {
    if (email.length > 254 || password.length > 128) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    const identifier = email.trim().toLowerCase();
    const row = this.db.prepare("SELECT * FROM local_users WHERE email=? OR username=?").get(identifier, identifier);
    const hash = derive(password, String(row?.salt ?? "dummy-auth-salt"));
    const expected = row ? Buffer.from(String(row.password_hash), "hex") : Buffer.alloc(64);
    if (!row || !timingSafeEqual(hash, expected) || !row.active) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    return { id: String(row.id), email: String(row.email), name: String(row.name), role: validateRole(String(row.role)), canSwitchRole: row.username === "admin" };
  }
  session(user: LocalUser) {
    const token = randomBytes(32).toString("hex");
    this.db.prepare("DELETE FROM local_sessions WHERE expires_at <= ?").run(Date.now());
    this.db.prepare("INSERT INTO local_sessions VALUES (?,?,?)").run(digest(token), user.id, Date.now() + SESSION_SECONDS * 1000);
    return token;
  }
  user(token?: string): LocalUser | null {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const row = this.db.prepare(`SELECT u.id,u.email,u.name,u.role,u.username FROM local_sessions s JOIN local_users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`).get(digest(token), Date.now());
    return row ? { id: String(row.id), email: String(row.email), name: String(row.name), role: validateRole(String(row.role)), canSwitchRole: row.username === "admin" } : null;
  }
  logout(token: string) { this.db.prepare("DELETE FROM local_sessions WHERE token_hash=?").run(digest(token)); }
}
let store: LocalAuthStore | undefined;
export function localAuth() {
  if (!store) {
    const created = new LocalAuthStore(resolve(process.env.LOCAL_AUTH_DB_PATH || "data/local-auth.sqlite"));
    try { created.ensureAdmin(); store = created; }
    catch (error) { created.db.close(); throw error; }
  }
  return store;
}
