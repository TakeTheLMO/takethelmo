import { expect, test } from "@playwright/test";

// 비로그인(또는 Supabase 미설정 = fail closed) 상태에서 공지사항 데이터는 보이지 않는다.
test("비로그인 상태에서 공지사항 목록은 로그인 안내를 보여준다", async ({ page }) => {
  await page.goto("/community/notices");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("공지사항");
  await expect(page.getByText("로그인한 기관 구성원만 볼 수 있습니다")).toBeVisible();
  const login = page.getByRole("main").getByRole("link", { name: "로그인" });
  await expect(login).toHaveAttribute("href", "/login?next=%2Fcommunity%2Fnotices");
  await expect(page.getByText("준비 중인 페이지입니다")).toHaveCount(0);
});

test("비로그인 상태에서 공지 상세도 로그인 안내를 보여준다", async ({ page }) => {
  await page.goto("/community/notices/d0000000-0000-0000-0000-000000000001");
  await expect(page.getByText("로그인한 기관 구성원만 볼 수 있습니다")).toBeVisible();
});

test("비로그인 상태에서 공지사항 관리는 로그인으로 보낸다", async ({ page }) => {
  await page.goto("/admin/notices/new");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fnotices%2Fnew/);
});
