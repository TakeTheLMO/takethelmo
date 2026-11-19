import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { validateRole, validateSignupRole, type AccountRole } from "./profile";
import { isUniqueViolation, type Row, type Sql } from "./sql";

export type LocalUser = { id: string; email: string; name: string; role: AccountRole; canSwitchRole: boolean };
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const derive = (password: string, salt: string) => scryptSync(password, salt, 64);
const toUser = (row: Row): LocalUser => ({ id: String(row.id), email: String(row.email), name: String(row.name), role: validateRole(String(row.role)), canSwitchRole: row.username === "admin" });

export class LocalAuthStore {
  constructor(readonly db: Sql) {}
  async ensureAdmin(password = "admin") {
    const salt = randomBytes(16).toString("hex");
    await this.db.run(`INSERT INTO local_users(id,email,name,password_hash,salt,username,role,position)
      VALUES (?,?,?,?,?,'admin','super_admin','시스템 관리자') ON CONFLICT DO NOTHING`,
    randomUUID(), "admin@prototype.local", "관리자", derive(password, salt).toString("hex"), salt);
  }
  async attempt(key: string, limit = 10) {
    const now = Date.now();
    const hashed = digest(key);
    const row = await this.db.tx(`attempt:${hashed}`, async db => {
      await db.run("DELETE FROM local_auth_attempts WHERE reset_at <= ?", now);
      await db.run(`INSERT INTO local_auth_attempts(key,count,reset_at) VALUES (?,1,?)
        ON CONFLICT(key) DO UPDATE SET count=local_auth_attempts.count+1`, hashed, now + 15 * 60_000);
      return db.get("SELECT count FROM local_auth_attempts WHERE key=?", hashed);
    });
    if (Number(row!.count) > limit) throw new Error("요청이 너무 많습니다. 15분 후 다시 시도해 주세요.");
  }
  async register(name: string, email: string, password: string, role = "researcher"): Promise<LocalUser> {
    name = name.trim(); email = email.trim().toLowerCase();
    if (email.startsWith("sample.") && email.endsWith("@example.test")) throw new Error("예시 데이터 전용 주소는 가입할 수 없습니다.");
    if (name.length < 2 || name.length > 40) throw new Error("이름은 2~40자로 입력해 주세요.");
    if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("이메일을 확인해 주세요.");
    if (password.length < 8 || password.length > 128) throw new Error("비밀번호는 8~128자로 입력해 주세요.");
    const salt = randomBytes(16).toString("hex");
    const user = { id: randomUUID(), email, name, role: validateSignupRole(role), canSwitchRole: false };
    try {
      await this.db.run("INSERT INTO local_users(id,email,name,password_hash,salt,role) VALUES (?,?,?,?,?,?)",
        user.id, email, name, derive(password, salt).toString("hex"), salt, user.role);
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error("이미 등록된 이메일입니다. 로그인해 주세요.");
      throw error;
    }
    return user;
  }
  async login(email: string, password: string): Promise<LocalUser> {
    if (email.length > 254 || password.length > 128) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    const identifier = email.trim().toLowerCase();
    const row = await this.db.get("SELECT * FROM local_users WHERE email=? OR username=?", identifier, identifier);
    const hash = derive(password, String(row?.salt ?? "dummy-auth-salt"));
    const expected = row ? Buffer.from(String(row.password_hash), "hex") : Buffer.alloc(64);
    if (!row || !timingSafeEqual(hash, expected) || !Number(row.active)) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    return toUser(row);
  }
  async session(user: LocalUser) {
    const token = randomBytes(32).toString("hex");
    await this.db.run("DELETE FROM local_sessions WHERE expires_at <= ?", Date.now());
    await this.db.run("INSERT INTO local_sessions(token_hash,user_id,expires_at) VALUES (?,?,?)", digest(token), user.id, Date.now() + SESSION_SECONDS * 1000);
    return token;
  }
  async user(token?: string): Promise<LocalUser | null> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const row = await this.db.get(`SELECT u.id,u.email,u.name,u.role,u.username FROM local_sessions s JOIN local_users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`, digest(token), Date.now());
    return row ? toUser(row) : null;
  }
  async logout(token: string) { await this.db.run("DELETE FROM local_sessions WHERE token_hash=?", digest(token)); }
}

async function open(): Promise<LocalAuthStore> {
  const url = process.env.PORTAL_DATABASE_URL;
  if (url) {
    const { createPostgres } = await import("./postgres");
    const store = new LocalAuthStore(createPostgres(url));
    // 공개 배포에서는 admin/admin 을 만들지 않는다. 비밀번호를 환경변수로 받은 경우에만 최초 1회 생성.
    const password = process.env.PORTAL_ADMIN_PASSWORD || "";
    if (password.length >= 12) await store.ensureAdmin(password);
    return store;
  }
  // fail closed: 서버리스 환경에서 SQLite 파일로 조용히 대체하지 않는다.
  if (process.env.VERCEL) throw new Error("PORTAL_DATABASE_URL 환경변수가 없어 포털 계정 저장소를 열 수 없습니다.");
  const { createSqlite } = await import("./sqlite");
  const store = new LocalAuthStore(createSqlite(resolve(process.env.LOCAL_AUTH_DB_PATH || "data/local-auth.sqlite")));
  try { await store.ensureAdmin(); } catch (error) { await store.db.close(); throw error; }
  return store;
}

let store: Promise<LocalAuthStore> | undefined;
export function localAuth() {
  store ??= open().catch(error => { store = undefined; console.error("[local-auth] 저장소 연결 실패:", error); throw error; });
  return store;
}
