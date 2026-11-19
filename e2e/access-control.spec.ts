import { registerLocalUser } from "./local-auth-helper";
import { expect, test } from "@playwright/test";

// Supabase 환경변수가 없는 상태(CI 기본값)에서도 보호 페이지가 열리지 않는지 확인한다 (fail closed).
test("비로그인 상태에서 /admin은 로그인으로 보낸다", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/institution-login\?next=%2Fadmin/);
});

test("비로그인 상태에서 /admin/users 같은 하위 경로도 보호된다", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/institution-login/);
});

test("외부 주소로의 next 파라미터는 무시된다 (로그인 화면은 정상 표시)", async ({ page }) => {
  await page.goto("/login?next=https://evil.example");
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
});

test("포털은 공개이고 실제 업무는 계정 로그인이 필요하다", async ({ page, baseURL }) => {
  await page.goto("/"); await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("안전한 연구환경");
  const redirect = await page.request.get("/mypage", { maxRedirects: 0 });
  expect(new URL(redirect.headers().location, baseURL).href).toBe(`${baseURL}/login?next=%2Fmypage`);
  const prefetched = await page.request.get("/mypage", { headers: { RSC: "1", "next-router-prefetch": "1" }, maxRedirects: 0 });
  const target = prefetched.headers().location || prefetched.headers()["x-nextjs-redirect"];
  expect(target).toBeTruthy();
  expect(new URL(target, baseURL).origin).toBe(baseURL);
  await page.goto("/safety/inspections"); await expect(page).toHaveURL(/\/login/);
  await registerLocalUser(page); await page.goto("/safety/inspections");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("안전점검");
  await expect(page.getByText("준비 중인 페이지입니다")).toHaveCount(0);
});

test("하위 메뉴가 없는 그룹 경로는 첫 하위 메뉴로 이동한다", async ({ page }) => {
  await registerLocalUser(page);
  await page.goto("/library");
  await expect(page).toHaveURL(/\/library\/manuals$/);
  await page.goto("/community");
  await expect(page).toHaveURL(/\/community\/notices$/);
});

test("푸터의 개인정보처리방침·이용약관은 404가 아니다", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("개인정보처리방침");
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("이용약관");
});

test("메뉴에 없는 경로는 404 안내를 보여준다", async ({ page }) => {
  const res = await page.goto("/safety/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
});
