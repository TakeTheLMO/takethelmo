import { expect, test } from "@playwright/test";
import { registerLocalUser } from "./local-auth-helper";

test("admin categorizes a user's records and files, follows a reference and edits a course", async ({ page, browser, baseURL }) => {
  const owner = await browser.newContext({ baseURL });
  try {
    const userPage = await owner.newPage(), email = await registerLocalUser(userPage, "분류 확인 연구자");
    await userPage.goto("/training/courses");
    await userPage.getByRole("button", { name: "교육과정·기록 추가" }).click();
    await userPage.getByLabel("교육과정 이름").fill("카테고리 확인 교육");
    await userPage.getByRole("button", { name: "교육과정 저장", exact: true }).click();
    await expect(userPage.getByText("서버 저장 완료", { exact: true })).toBeVisible();
    await page.request.post("/api/auth/login", { headers: { origin: baseURL! }, data: { email: "admin", password: "admin" } });
    await page.goto("/management/users");
    await page.getByRole("button", { name: "전체 등록 자료", exact: true }).click();
    await page.getByLabel("사용자 등록 자료 검색").fill(email);
    await page.getByRole("button", { name: /^교육과정 \d/ }).click();
    await page.getByRole("link", { name: /카테고리 확인 교육/ }).click();
    await expect(page.getByLabel("자료 유형")).toHaveValue("courses");
    await expect(page.getByLabel("자료 제목")).toHaveValue("카테고리 확인 교육");
    await page.getByLabel("자료 제목").fill("관리자가 정정한 교육");
    await page.getByLabel("자료 수정 사유").fill("교육명 확인 후 정정");
    await page.getByRole("button", { name: "자료 수정 저장", exact: true }).click();
    await expect(page.getByText("수정 내용과 이력을 저장했습니다.", { exact: true })).toBeVisible();
    await userPage.reload();
    await expect(userPage.getByRole("heading", { name: "관리자가 정정한 교육", exact: true })).toBeVisible();
    await page.goto("/management/menus?path=%2Ftraining%2Fcourses");
    await page.getByRole("button", { name: /사용자 업무 자료/ }).click();
    await page.getByLabel("사용자 등록 자료 검색").fill(email);
    await expect(page.getByRole("link", { name: /관리자가 정정한 교육/ })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await owner.close(); }
});

test("admin publishes menu content and attachments, users see updates and lose access when archived", async ({ page, browser, baseURL }) => {
  test.setTimeout(60000);
  const owner = await browser.newContext({ baseURL });
  try {
    const userPage = await owner.newPage(); await registerLocalUser(userPage);
    expect((await userPage.request.get("/api/portal-content?path=/library/msds")).status()).toBe(403);
    expect((await userPage.request.post("/api/portal-content", { headers: { origin: baseURL! }, data: {} })).status()).toBe(403);
    expect((await userPage.request.get("/api/account-data?view=files")).status()).toBe(403);
    await userPage.goto("/management/menus"); await expect(userPage).toHaveURL(/\/mypage$/);
    await page.request.post("/api/auth/login", { headers: { origin: baseURL! }, data: { email: "admin", password: "admin" } });
    await page.goto("/management/menus?path=%2Flibrary%2Fmsds");
    await page.getByLabel("페이지 안내 본문").fill("검증용 기관 자료 안내입니다.");
    await page.getByRole("button", { name: "+ 공통 자료 추가", exact: true }).click();
    await page.getByLabel("공통 자료 제목").fill("공통 자료 게시 검증");
    await page.getByLabel("공통 자료 내용").fill("기관 담당자가 확인한 자료를 여기에 등록합니다.");
    await page.getByLabel("공통 자료 분류").selectOption("MSDS");
    await page.getByLabel("공통 자료 첨부", { exact: true }).setInputFiles({ name: "shared-reference.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5X8AAAAASUVORK5CYII=", "base64") });
    await expect(page.getByRole("link", { name: "shared-reference.png", exact: true })).toBeVisible();
    await page.getByLabel("메뉴 수정 사유").fill("초안 원본 검토");
    await page.getByRole("button", { name: "메뉴 내용 저장", exact: true }).click();
    await expect(page.getByText("저장했습니다. 게시 중인 내용은 해당 메뉴에 반영됩니다.")).toBeVisible();
    await userPage.goto("/library/msds"); await expect(userPage.getByText("공통 자료 게시 검증", { exact: true })).toHaveCount(0);
    await page.getByLabel("공개 상태").selectOption("published");
    await page.getByLabel("메뉴 수정 사유").fill("검토 후 게시");
    await page.getByRole("button", { name: "메뉴 내용 저장", exact: true }).click();
    await expect(page.getByText("저장했습니다. 게시 중인 내용은 해당 메뉴에 반영됩니다.")).toBeVisible();
    await userPage.reload(); await expect(userPage.getByRole("heading", { name: "공통 자료 게시 검증" })).toBeVisible();
    const link = userPage.getByRole("link", { name: /첨부 다운로드 · shared-reference.png/ }), href = await link.getAttribute("href");
    expect((await userPage.request.get(href!)).status()).toBe(200);
    await userPage.goto("/support/search"); await userPage.getByLabel("검색어", { exact: true }).fill("공통 자료 게시 검증");
    await expect(userPage.getByRole("link", { name: /공통 자료 게시 검증/ })).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: "output/playwright/menu-management.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: "output/playwright/menu-management-mobile.png", fullPage: true });
    await page.getByLabel("공개 상태").selectOption("archived");
    await page.getByLabel("메뉴 수정 사유").fill("개정에 따른 보관");
    await page.getByRole("button", { name: "메뉴 내용 저장", exact: true }).click();
    await expect(page.getByText("저장했습니다. 게시 중인 내용은 해당 메뉴에 반영됩니다.")).toBeVisible();
    expect((await userPage.request.get(href!)).status()).toBe(403);
    await userPage.goto("/library/msds"); await expect(userPage.getByText("공통 자료 게시 검증", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "수정 이력", exact: true }).click();
    await expect(page.locator("summary").filter({ hasText: "개정에 따른 보관" })).toBeVisible();
  } finally { await owner.close(); }
});
