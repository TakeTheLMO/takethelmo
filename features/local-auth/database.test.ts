import { afterEach, describe, expect, it } from "vitest";
import { createSqlite } from "./sqlite";
import { LocalAuthStore } from "./database";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyAccountRole } from "./profile";
let store: LocalAuthStore | undefined;
afterEach(() => { store?.db.close(); store = undefined; });
describe("local account authentication", () => {
  it("creates an idempotent admin account with a hashed password and persists its session profile", async () => {
    store = new LocalAuthStore(createSqlite(":memory:"));
    await store.ensureAdmin();
    const admin = await store.login("admin", "admin");
    expect(admin).toMatchObject({ role: "super_admin", canSwitchRole: true });
    const token = await store.session(admin);
    await store.ensureAdmin();
    expect((await store.login("ADMIN", "admin")).id).toBe(admin.id);
    expect(await store.user(token)).toEqual(admin);
    await expect(store!.login("admin", "wrong")).rejects.toThrow();
    expect((await store.db.get("SELECT password_hash FROM local_users WHERE username='admin'"))?.password_hash).not.toBe("admin");
    await store.db.run("UPDATE local_users SET active=0 WHERE username='admin'");
    await store.ensureAdmin();
    await expect(store!.login("admin", "admin")).rejects.toThrow();
  });
  it("validates and restores the selected role on login", async () => {
    store = new LocalAuthStore(createSqlite(":memory:"));
    const user = await store.register("책임 연구자", "profile@example.com", "test-password-123", "lmo_manager");
    expect(await store.login(user.email, "test-password-123")).toEqual(user);
    await expect(store!.register("연구자", "bad@example.com", "test-password-123", "owner")).rejects.toThrow("역할");
    await expect(store!.register("연구자", "bad@example.com", "test-password-123", "")).rejects.toThrow("역할");
  });
  it("reserves system administrator and example addresses, while preserving legacy account sessions", async () => {
    store = new LocalAuthStore(createSqlite(":memory:"));
    await expect(store!.register("별도 관리자", "other-admin@example.com", "test-password-123", "super_admin")).rejects.toThrow("시스템 관리자");
    await expect(store!.register("예시 사칭", "sample.fake@example.test", "test-password-123")).rejects.toThrow("예시 데이터 전용");
    const registered = await store.register("기존 관리자", "other-admin@example.com", "test-password-123", "safety_admin");
    await store.db.run("UPDATE local_users SET role='super_admin' WHERE id=?", registered.id);
    const user = await store.login(registered.email, "test-password-123");
    expect(user.canSwitchRole).toBe(false);
    expect((await store.login(user.email, "test-password-123")).canSwitchRole).toBe(false);
    expect((await store.user(await store.session(user)))?.canSwitchRole).toBe(false);
    const oldState = { role: "researcher" as const, title: "보존할 기록" };
    expect(applyAccountRole(user, oldState)).toEqual({ ...oldState, role: "super_admin" });
    expect(applyAccountRole({ role: "super_admin", canSwitchRole: true }, oldState)).toBe(oldState);
  });
  it("adds profile fields to an existing account database without changing old account data", async () => {
    const directory = mkdtempSync(join(tmpdir(), "lmo-auth-migration-"));
    try {
      const path = join(directory, "old.sqlite");
      const old = new DatabaseSync(path);
      old.exec(`CREATE TABLE local_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
        INSERT INTO local_users VALUES ('old-user','old@example.com','기존 연구자','original-hash','original-salt',1)`);
      old.close();
      const migrated = new LocalAuthStore(createSqlite(path));
      try {
        expect(await migrated.db.get("SELECT * FROM local_users WHERE id='old-user'")).toMatchObject({
          email: "old@example.com", password_hash: "original-hash", salt: "original-salt", role: "researcher", position: "연구원",
        });
        await migrated.ensureAdmin();
        expect((await migrated.login("admin", "admin")).role).toBe("super_admin");
      } finally { migrated.db.close(); }
    } finally { rmSync(directory, { recursive: true }); }
  });
  it("normalizes email, hashes passwords and prevents duplicate accounts", async () => {
    store = new LocalAuthStore(createSqlite(":memory:"));
    const user = await store.register("연구자 A", " A@example.com ", "test-password-123");
    expect(user.email).toBe("a@example.com");
    expect((await store.login("A@example.com", "test-password-123")).id).toBe(user.id);
    await expect(store!.login(user.email, "wrong-password")).rejects.toThrow();
    await expect(store!.register("연구자 B", user.email, "test-password-123")).rejects.toThrow();
    expect((await store.db.get("SELECT password_hash FROM local_users"))?.password_hash).not.toBe("test-password-123");
  });
  it("rejects forged, expired, revoked and inactive sessions", async () => {
    store = new LocalAuthStore(createSqlite(":memory:"));
    const user = await store.register("연구자 A", "a@example.com", "test-password-123");
    const token = await store.session(user);
    expect((await store.user(token))?.id).toBe(user.id);
    expect(await store.user("f".repeat(64))).toBeNull();
    await store.logout(token); expect(await store.user(token)).toBeNull();
    const expired = await store.session(user);
    await store.db.run("UPDATE local_sessions SET expires_at=0"); expect(await store.user(expired)).toBeNull();
    const disabled = await store.session(user);
    await store.db.run("UPDATE local_users SET active=0"); expect(await store.user(disabled)).toBeNull();
    await expect(store!.login(user.email, "test-password-123")).rejects.toThrow();
  });
  it("limits repeated attempts", async () => {
    store = new LocalAuthStore(createSqlite(":memory:"));
    await store.attempt("account", 1);
    await expect(store!.attempt("account", 1)).rejects.toThrow("15분");
  });
});
