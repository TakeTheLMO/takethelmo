import { afterEach, describe, expect, it } from "vitest";
import { LocalAuthStore } from "./database";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyAccountRole } from "./profile";
let store: LocalAuthStore | undefined;
afterEach(() => { store?.db.close(); store = undefined; });
describe("local account authentication", () => {
  it("creates an idempotent admin account with a hashed password and persists its session profile", () => {
    store = new LocalAuthStore(":memory:");
    store.ensureAdmin();
    const admin = store.login("admin", "admin");
    expect(admin).toMatchObject({ role: "super_admin", canSwitchRole: true });
    const token = store.session(admin);
    store.ensureAdmin();
    expect(store.login("ADMIN", "admin").id).toBe(admin.id);
    expect(store.user(token)).toEqual(admin);
    expect(() => store!.login("admin", "wrong")).toThrow();
    expect(store.db.prepare("SELECT password_hash FROM local_users WHERE username='admin'").get()?.password_hash).not.toBe("admin");
    store.db.exec("UPDATE local_users SET active=0 WHERE username='admin'");
    store.ensureAdmin();
    expect(() => store!.login("admin", "admin")).toThrow();
  });
  it("validates and restores the selected role on login", () => {
    store = new LocalAuthStore(":memory:");
    const user = store.register("책임 연구자", "profile@example.com", "test-password-123", "lmo_manager");
    expect(store.login(user.email, "test-password-123")).toEqual(user);
    expect(() => store!.register("연구자", "bad@example.com", "test-password-123", "owner")).toThrow("역할");
    expect(() => store!.register("연구자", "bad@example.com", "test-password-123", "")).toThrow("역할");
  });
  it("reserves system administrator and example addresses, while preserving legacy account sessions", () => {
    store = new LocalAuthStore(":memory:");
    expect(() => store!.register("별도 관리자", "other-admin@example.com", "test-password-123", "super_admin")).toThrow("시스템 관리자");
    expect(() => store!.register("예시 사칭", "sample.fake@example.test", "test-password-123")).toThrow("예시 데이터 전용");
    const registered = store.register("기존 관리자", "other-admin@example.com", "test-password-123", "safety_admin");
    store.db.prepare("UPDATE local_users SET role='super_admin' WHERE id=?").run(registered.id);
    const user = store.login(registered.email, "test-password-123");
    expect(user.canSwitchRole).toBe(false);
    expect(store.login(user.email, "test-password-123").canSwitchRole).toBe(false);
    expect(store.user(store.session(user))?.canSwitchRole).toBe(false);
    const oldState = { role: "researcher" as const, title: "보존할 기록" };
    expect(applyAccountRole(user, oldState)).toEqual({ ...oldState, role: "super_admin" });
    expect(applyAccountRole({ role: "super_admin", canSwitchRole: true }, oldState)).toBe(oldState);
  });
  it("adds profile fields to an existing account database without changing old account data", () => {
    const directory = mkdtempSync(join(tmpdir(), "lmo-auth-migration-"));
    try {
      const path = join(directory, "old.sqlite");
      const old = new DatabaseSync(path);
      old.exec(`CREATE TABLE local_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
        INSERT INTO local_users VALUES ('old-user','old@example.com','기존 연구자','original-hash','original-salt',1)`);
      old.close();
      const migrated = new LocalAuthStore(path);
      try {
        expect(migrated.db.prepare("SELECT * FROM local_users WHERE id='old-user'").get()).toMatchObject({
          email: "old@example.com", password_hash: "original-hash", salt: "original-salt", role: "researcher", position: "연구원",
        });
        migrated.ensureAdmin();
        expect(migrated.login("admin", "admin").role).toBe("super_admin");
      } finally { migrated.db.close(); }
    } finally { rmSync(directory, { recursive: true }); }
  });
  it("normalizes email, hashes passwords and prevents duplicate accounts", () => {
    store = new LocalAuthStore(":memory:");
    const user = store.register("연구자 A", " A@example.com ", "test-password-123");
    expect(user.email).toBe("a@example.com");
    expect(store.login("A@example.com", "test-password-123").id).toBe(user.id);
    expect(() => store!.login(user.email, "wrong-password")).toThrow();
    expect(() => store!.register("연구자 B", user.email, "test-password-123")).toThrow();
    expect(store.db.prepare("SELECT password_hash FROM local_users").get()?.password_hash).not.toBe("test-password-123");
  });
  it("rejects forged, expired, revoked and inactive sessions", () => {
    store = new LocalAuthStore(":memory:");
    const user = store.register("연구자 A", "a@example.com", "test-password-123");
    const token = store.session(user);
    expect(store.user(token)?.id).toBe(user.id);
    expect(store.user("f".repeat(64))).toBeNull();
    store.logout(token); expect(store.user(token)).toBeNull();
    const expired = store.session(user);
    store.db.exec("UPDATE local_sessions SET expires_at=0"); expect(store.user(expired)).toBeNull();
    const disabled = store.session(user);
    store.db.exec("UPDATE local_users SET active=0"); expect(store.user(disabled)).toBeNull();
    expect(() => store!.login(user.email, "test-password-123")).toThrow();
  });
  it("limits repeated attempts", () => {
    store = new LocalAuthStore(":memory:");
    store.attempt("account", 1);
    expect(() => store!.attempt("account", 1)).toThrow("15분");
  });
});
