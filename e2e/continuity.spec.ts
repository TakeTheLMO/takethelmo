import { expect, test } from "@playwright/test";
test("문의 초안 복원·응답 연결·제출 후 초안 정리", async ({ page }) => {
  await page.goto("/demo/requests?kind=ibc");
  await page.getByLabel("신청 제목").fill("복원할 문의");
  await page.getByLabel("5. 실험 개요·문의 사항").fill("기존 작성 내용 보존");
  await page.reload();
  await expect(page.getByLabel("신청 제목")).toHaveValue("복원할 문의");
  await page.goto("/demo/assessment");
  for (let i = 0; i < 4; i++)
    await page
      .locator("fieldset")
      .nth(i)
      .getByLabel("아니요", { exact: true })
      .check();
  await page.getByRole("button", { name: "확인할 항목 정리하기" }).click();
  await page
    .getByRole("button", { name: "IBC 사전 문의 작성", exact: true })
    .click();
  await expect(page.getByLabel("5. 실험 개요·문의 사항")).toHaveValue(
    "기존 작성 내용 보존",
  );
  await expect(
    page.getByText("연결된 LMO 확인 결과", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("1. 실험 유형", { exact: false }).fill("가상 유형");
  await page.getByLabel("2. 사용 물질", { exact: false }).fill("확인 필요");
  await page.getByLabel("시작 시기 미정").check();
  await page.goto("/demo");
  await page.goto("/demo/requests");
  await expect(page.getByLabel("신청 제목")).toHaveValue("복원할 문의");
  await page
    .getByRole("button", { name: "사전 문의 제출 (체험)", exact: true })
    .click();
  const card = page.locator("section").filter({
    has: page.getByRole("heading", { name: "복원할 문의", exact: true }),
  });
  await expect(card).toContainText(
    "동물에게 물질을 투여하는 실험이 포함되나요? 아니요",
  );
  await page.reload();
  await expect(page.getByLabel("신청 제목")).toHaveCount(0);
  await page
    .getByRole("button", { name: "IBC 사전 문의 작성", exact: true })
    .click();
  await expect(page.getByLabel("신청 제목")).toHaveValue("");
});
test("대장 정정과 이력을 역할 전환·새로고침 후에도 유지", async ({ page }) => {
  await page.goto("/demo/labs");
  await page.getByRole("button", { name: "관리대장", exact: true }).click();
  await expect(page.getByRole("button", { name: "기록 정정" })).toHaveCount(0);
  await page.getByLabel("체험 역할 전환").selectOption("lmo_manager");
  await page.getByRole("button", { name: "기록 정정" }).first().click();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel("정정 물질명·대상").fill("정정한 기존 대상");
  await page.getByLabel("정정 기존 단일 수량").fill("3");
  await page.getByLabel("정정 사유").fill("원자료와 대조해 오기 수정");
  await page.getByRole("button", { name: "정정 저장", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "관리대장", exact: true }).click();
  await page.getByText("정정 이력 (1)", { exact: true }).click();
  await expect(
    page.getByText("예제 관리기록 A → 정정한 기존 대상", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1 → 3", { exact: true })).toBeVisible();
  await page.locator("article").filter({ has: page.getByRole("heading", { name: "정정한 기존 대상", exact: true }) }).screenshot({ path: "output/playwright/ledger-revision.png", style: "header { visibility: hidden !important; }" });
  await page.getByLabel("체험 역할 전환").selectOption("researcher");
  await expect(page.getByRole("button", { name: "기록 정정" })).toHaveCount(0);
  await expect(
    page.getByText("사유: 원자료와 대조해 오기 수정", { exact: true }),
  ).toBeVisible();
});
