import { test, expect } from "@playwright/test";
import { registerLocalUser } from "./local-auth-helper";
test("signup, logout, bad password, re-login and account record separation", async ({ page }) => {
  await page.goto("/labs");
  await expect(page).toHaveURL(/login/);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  const email = `test-${crypto.randomUUID()}@example.com`;
  await page.getByLabel("이름", { exact: true }).fill("첫번째 연구자");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호").fill("test-password-123");
  await page.getByLabel("역할", { exact: true }).selectOption("lmo_manager");
  await expect(page.getByLabel("직책", { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "output/playwright/signup-profile-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "가입하고 시작하기" }).click();
  await expect(page).toHaveURL(/\/labs$/);
  await expect(page.getByText("첫번째 연구자", { exact: true })).toBeVisible();
  await expect(page.getByLabel("체험 역할 전환")).toHaveCount(0);
  await expect(page.getByText("첫번째 연구자 · LMO 담당자", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "관리대장", exact: true }).click();
  await page.getByRole("button", { name: "기록 추가", exact: true }).click();
  await page.getByLabel("물질명", { exact: true }).fill("A 계정 전용 기록");
  await page.getByLabel("입고량", { exact: true }).fill("2");
  await page.getByRole("button", { name: "관리기록 저장" }).click();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/portal/);
  await registerLocalUser(page, "두번째 연구자");
  await page.goto("/labs");
  await page.getByRole("button", { name: "관리대장", exact: true }).click();
  await expect(page.getByText("A 계정 전용 기록", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/portal/);
  await page.goto("/login");
  await page.getByLabel("아이디 또는 이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호").fill("wrong-password");
  await page.getByRole("button", { name: "로그인하기" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "올바르지 않습니다" })).toContainText("올바르지 않습니다");
  await page.getByLabel("비밀번호").fill("test-password-123");
  await page.getByRole("button", { name: "로그인하기" }).click();
  await expect(page).toHaveURL(/\/mypage$/);
  await page.goto("/labs");
  await page.getByRole("button", { name: "관리대장", exact: true }).click();
  await expect(page.getByText("A 계정 전용 기록", { exact: true })).toBeVisible();
  await expect(page.getByText("첫번째 연구자 · LMO 담당자", { exact: true })).toBeVisible();
});

test("admin identifier login persists and invalid signup profiles are rejected", async ({ page, baseURL }) => {
  const rejected = await page.request.post("/api/prototype-auth/register", {
    headers: { origin: baseURL! },
    data: { name: "잘못된 가입", email: `bad-${crypto.randomUUID()}@example.com`, password: "test-password-123", role: "invalid" },
  });
  expect(rejected.status()).toBe(400);
  await page.goto("/login");
  await page.getByLabel("아이디 또는 이메일").fill("admin");
  await page.getByLabel("비밀번호").fill("admin");
  await page.getByRole("button", { name: "로그인하기" }).click();
  await expect(page).toHaveURL(/\/mypage$/);
  await expect(page.getByText("시스템 관리자", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("관리자 · 시스템 관리자", { exact: true })).toBeVisible();
  await page.screenshot({ path: "output/playwright/admin-account.png", fullPage: true });
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/portal/);
});
test("ordinary accounts keep their signup role when old browser data requests another role", async ({ page }) => {
  await registerLocalUser(page);
  await page.goto("/mypage");
  await expect(page.getByLabel("체험 역할 전환")).toHaveCount(0);
  // Save a record before simulating a role selected by a previous app version.
  await page.goto("/mypage/requests");
  await page.getByRole("button", { name: "+ 새 신청서", exact: true }).click();
  await page.getByLabel("신청 제목").fill("역할 보존 확인용 초안");
  await expect(page.getByText("서버 저장 완료", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.includes(":user:"));
    if (!key) throw new Error("계정 저장 키가 없습니다.");
    const previous = JSON.parse(localStorage.getItem(key)!);
    previous.role = "super_admin";
    localStorage.setItem(key, JSON.stringify(previous));
    dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(previous) }));
  });
  await expect(page.getByLabel("체험 역할 전환")).toHaveCount(0);
  await page.reload();
  await page.goto("/labs");
  await page.getByRole("button", { name: "관리대장", exact: true }).click();
  await expect(page.getByRole("button", { name: "기록 추가", exact: true })).toHaveCount(0);
  await expect(page.getByText("테스트 연구자 · 일반 연구원", { exact: true })).toBeVisible();
  await page.screenshot({ path: "output/playwright/ordinary-account.png", fullPage: true });
});

test("forged cookie and foreign-origin requests are rejected", async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "takethelmo-local-session", value: "f".repeat(64), url: baseURL! }]);
  await page.goto("/mypage/requests");
  await expect(page).toHaveURL(/login/);
  const response = await page.request.post("/api/prototype-auth/register", { headers: { origin: "https://other.example" }, data: {} });
  expect(response.status()).toBe(403);
});
