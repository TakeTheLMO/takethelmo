import { describe, expect, it } from "vitest";
import { canAccessAdminArea, canChangeAccount, canGrantScopedRole } from "./permissions";

const base = { actorId: "a", targetId: "t" } as const;

describe("canChangeAccount (DB guard_profile_change와 동일 규칙)", () => {
  it("일반 사용자는 누구도 변경할 수 없다", () => {
    expect(canChangeAccount({ ...base, actorRole: "researcher", targetCurrentRole: "researcher", newRole: "lab_manager" }).ok).toBe(false);
  });
  it("본인의 권한은 super_admin도 변경할 수 없다", () => {
    expect(canChangeAccount({ actorId: "a", targetId: "a", actorRole: "super_admin", targetCurrentRole: "super_admin", newRole: "researcher" }).ok).toBe(false);
  });
  it("safety_admin은 safety_admin/super_admin을 지정할 수 없다", () => {
    expect(canChangeAccount({ ...base, actorRole: "safety_admin", targetCurrentRole: "researcher", newRole: "safety_admin" }).ok).toBe(false);
    expect(canChangeAccount({ ...base, actorRole: "safety_admin", targetCurrentRole: "researcher", newRole: "super_admin" }).ok).toBe(false);
  });
  it("safety_admin은 관리자 계정을 해제·비활성화할 수 없다", () => {
    expect(canChangeAccount({ ...base, actorRole: "safety_admin", targetCurrentRole: "safety_admin", newRole: "researcher" }).ok).toBe(false);
    expect(canChangeAccount({ ...base, actorRole: "safety_admin", targetCurrentRole: "super_admin" }).ok).toBe(false);
  });
  it("safety_admin은 일반/범위 역할 사용자를 관리할 수 있다", () => {
    expect(canChangeAccount({ ...base, actorRole: "safety_admin", targetCurrentRole: "researcher", newRole: "lab_manager" }).ok).toBe(true);
  });
  it("super_admin은 관리자 권한을 지정·해제할 수 있다", () => {
    expect(canChangeAccount({ ...base, actorRole: "super_admin", targetCurrentRole: "safety_admin", newRole: "researcher" }).ok).toBe(true);
    expect(canChangeAccount({ ...base, actorRole: "super_admin", targetCurrentRole: "researcher", newRole: "super_admin" }).ok).toBe(true);
  });
});

describe("canGrantScopedRole", () => {
  it("safety_admin은 lab_manager/lmo_manager만 부여", () => {
    expect(canGrantScopedRole("safety_admin", "lab_manager").ok).toBe(true);
    expect(canGrantScopedRole("safety_admin", "lmo_manager").ok).toBe(true);
    expect(canGrantScopedRole("safety_admin", "safety_admin").ok).toBe(false);
  });
  it("lab_manager/researcher는 부여할 수 없다", () => {
    expect(canGrantScopedRole("lab_manager", "lab_manager").ok).toBe(false);
    expect(canGrantScopedRole("researcher", "lab_manager").ok).toBe(false);
  });
});

describe("canAccessAdminArea", () => {
  it("researcher와 비로그인은 관리자 영역에 들어갈 수 없다", () => {
    expect(canAccessAdminArea("researcher")).toBe(false);
    expect(canAccessAdminArea(null)).toBe(false);
    expect(canAccessAdminArea("lab_manager")).toBe(true);
  });
});
