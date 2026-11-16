import { expect, test, type Page } from "@playwright/test";
import legacy from "./fixtures/demo-v1.json";
const newKey = "takethelmo:frontend-demo:v2";
const oldKey = "takethelmo:frontend-demo:v1";
async function role(page: Page, value: string) {
  await page.getByLabel("체험 역할 전환").selectOption(value);
}
const inquiryCard = (page: Page) =>
  page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "실험 절차 사전 문의",
      exact: true,
    }),
  });
async function submitInquiry(page: Page) {
  await page.goto("/demo/requests?kind=ibc");
  await page.getByLabel("신청 제목").fill("실험 절차 사전 문의");
  await page
    .getByLabel("1. 실험 유형", { exact: false })
    .fill("가상 동물 실험");
  await page
    .getByLabel("2. 사용 물질", { exact: false })
    .fill("가상 물질 · 자료 확인 필요");
  await page.getByLabel("시작 시기 미정").check();
  await page
    .getByLabel("5. 실험 개요·문의 사항")
    .fill("필요한 절차를 확인하고 싶습니다.");
  await page
    .getByRole("button", { name: "사전 문의 제출 (체험)", exact: true })
    .click();
  await expect(inquiryCard(page)).toBeVisible();
}
test("IBC 문의의 역할별 수신·추가 정보·재제출·답변 확인", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/demo");
  await role(page, "lmo_manager");
  const beforeText = await page
    .getByRole("link")
    .filter({ hasText: "검토·답변할 요청" })
    .innerText();
  const beforeCount = Number(beforeText.match(/(\d+)건/)![1]);
  await role(page, "researcher");
  await submitInquiry(page);
  const card = inquiryCard(page);
  await expect(
    card.locator("span").filter({ hasText: /^접수$/ }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "답변 준비 시작" }),
  ).toHaveCount(0);
  await role(page, "lab_manager");
  await expect(card).toHaveCount(0);
  await role(page, "lmo_manager");
  await expect(card).toBeVisible();
  await page.goto("/demo/notifications");
  await expect(
    page.getByText("실험 절차 사전 문의 답변을 준비해 주세요", { exact: true }),
  ).toBeVisible();
  await page.goto("/demo");
  await expect(
    page.getByRole("link").filter({ hasText: "검토·답변할 요청" }),
  ).toContainText(`${beforeCount + 1}건`);
  await page.goto("/demo/requests");
  await card.getByRole("button", { name: "답변 준비 시작" }).click();
  await expect(card.getByLabel("문의 처리 상태").locator("option")).toHaveText([
    "답변 완료",
    "추가 정보 요청",
  ]);
  await card.getByLabel("문의 처리 상태").selectOption("추가 정보 요청");
  await card
    .getByLabel("담당자 답변", { exact: true })
    .fill("사용 물질 자료의 유무를 알려 주세요.");
  await card.getByRole("button", { name: "문의 답변 저장" }).click();
  await page.goto("/demo/notifications");
  await expect(
    page.getByText("실험 절차 사전 문의 답변을 준비해 주세요", { exact: true }),
  ).toHaveCount(0);
  await role(page, "researcher");
  await page.goto("/demo");
  await expect(
    page.getByRole("link").filter({ hasText: "실험 절차 사전 문의" }),
  ).toContainText("추가 정보 요청");
  await page.goto("/demo/requests");
  await card
    .getByLabel("2. 사용 물질", { exact: false })
    .fill("가상 물질 · 자료 확보");
  await card.getByLabel("추가 정보 설명").fill("자료 유무를 확인했습니다.");
  await card.getByRole("button", { name: "추가 정보 제출 (체험)" }).click();
  await expect(
    card.locator("span").filter({ hasText: /^접수$/ }),
  ).toBeVisible();
  await expect(
    card.getByRole("heading", { name: "이전 추가 정보 요청 · 답변 대기" }),
  ).toBeVisible();
  await role(page, "lmo_manager");
  await card.getByRole("button", { name: "답변 준비 시작" }).click();
  await card
    .getByLabel("담당자 답변", { exact: true })
    .fill(
      "기관 담당자와 정식 심의 절차를 확인해 주세요. 실험 시작 허가가 아닙니다.",
    );
  await card.getByRole("button", { name: "문의 답변 저장" }).click();
  await page.getByRole("button", { name: "처리 완료", exact: true }).click();
  await expect(card).toBeVisible();
  await role(page, "researcher");
  await page.reload();
  await expect(
    card.getByRole("heading", { name: "담당자 답변 · 답변 완료" }),
  ).toBeVisible();
  await expect(
    card
      .getByRole("heading", { name: "담당자 답변 · 답변 완료" })
      .locator("..")
      .getByText(
        "기관 담당자와 정식 심의 절차를 확인해 주세요. 실험 시작 허가가 아닙니다.",
        { exact: true },
      ),
  ).toBeVisible();
  await card.screenshot({
    path: "output/playwright/lmo-inquiry-answer.png",
  });
});
test("유형 전환과 작성 닫기에서 각 초안을 보존", async ({ page }) => {
  await page.goto("/demo/requests?kind=ibc");
  await page.getByLabel("신청 제목").fill("문의 초안");
  await page
    .getByLabel("1. 실험 유형", { exact: false })
    .fill("보존할 실험 유형");
  await page.getByLabel("신청 유형").selectOption("연구실 출입");
  await page.getByLabel("신청 제목").fill("출입 초안");
  await page.getByLabel("신청 내용").fill("출입 내용 보존");
  await page.getByLabel("신청 유형").selectOption("IBC 사전 문의");
  await expect(page.getByLabel("신청 제목")).toHaveValue("문의 초안");
  await expect(page.getByLabel("1. 실험 유형", { exact: false })).toHaveValue(
    "보존할 실험 유형",
  );
  await page.getByRole("button", { name: "작성 닫기", exact: true }).click();
  await page.getByRole("button", { name: "+ 새 신청서", exact: true }).click();
  await expect(page.getByLabel("신청 제목")).toHaveValue("문의 초안");
  await page.getByLabel("신청 유형").selectOption("연구실 출입");
  await expect(page.getByLabel("신청 내용")).toHaveValue("출입 내용 보존");
});
test("동물 투여 응답과 관계없이 사전 문의 진입 및 네 답변 저장", async ({
  page,
}) => {
  await page.goto("/demo/assessment");
  for (let i = 0; i < 4; i++)
    await page
      .locator("fieldset")
      .nth(i)
      .getByLabel("아니요", { exact: true })
      .check();
  await page.getByRole("button", { name: "확인할 항목 정리하기" }).click();
  await expect(page.getByText(/‘아니요’를 선택해도/)).toBeVisible();
  await page.reload();
  await expect(
    page.locator("fieldset").nth(3).getByLabel("아니요", { exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "IBC 사전 문의 작성", exact: true })
    .click();
  await expect(page.getByLabel("신청 유형")).toHaveValue("IBC 사전 문의");
  await page.goto("/demo/assessment");
  for (const answer of ["예", "모르겠어요"]) {
    await page
      .locator("fieldset")
      .nth(3)
      .getByLabel(answer, { exact: true })
      .check();
    await page.getByRole("button", { name: "확인할 항목 정리하기" }).click();
    await expect(
      page.getByText(/동물 투여 계획이 있거나 확실하지 않다면/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "IBC 사전 문의 작성", exact: true }),
    ).toBeVisible();
  }
});
test("v1 기록과 미완료 네 번째 질문 보존, 새 단위 저장과 모바일 안내", async ({
  page,
}) => {
  await page.addInitScript(
    ({ value, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(value));
    },
    {
      value: {
        ...legacy,
        assessment: { organism: "예", modified: "예", facility: "예" },
      },
      key: oldKey,
    },
  );
  await page.goto("/demo/assessment");
  await expect(page.getByText(/새로 추가된 동물 투여 질문/)).toBeVisible();
  await expect(
    page.locator("fieldset").nth(3).getByRole("radio", { checked: true }),
  ).toHaveCount(0);
  await page.goto("/demo/labs");
  await page.getByRole("button", { name: "관리대장", exact: true }).click();
  await page.getByText("작성 예시 보기", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "예시 1 · 입고 후 일부 사용" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "기록 추가" })).toHaveCount(0);
  await expect(
    page.getByText("예제 관리기록 A", { exact: true }),
  ).toBeVisible();
  await role(page, "lmo_manager");
  await page.getByRole("button", { name: "기록 추가" }).click();
  await page.getByLabel("물질명", { exact: false }).fill("배양 증가 가상 사례");
  await page.getByLabel("입고량", { exact: true }).fill("1");
  await page.getByLabel("사용량", { exact: true }).fill("0");
  await page.getByLabel("보관량", { exact: true }).fill("10");
  await page
    .getByRole("combobox", { name: "수량 단위", exact: true })
    .selectOption("tube");
  await page
    .getByLabel("비고", { exact: false })
    .fill("배양으로 1 tube → 10 tube");
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const messageClose = page.getByRole("button", { name: "메시지 닫기" });
  if (await messageClose.isVisible()) await messageClose.click();
  await page
    .locator("form")
    .filter({
      has: page.getByRole("button", { name: "관리기록 저장", exact: true }),
    })
    .screenshot({
      path: "output/playwright/lmo-ledger-mobile.png",
      style: "header { visibility: hidden !important; }",
    });
  await page.getByRole("button", { name: "관리기록 저장" }).click();
  await expect(
    page.getByText("배양 증가 가상 사례", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "관리대장", exact: true }).click();
  await expect(
    page.getByText("배양 증가 가상 사례", { exact: true }),
  ).toBeVisible();
  const values = await page.evaluate(
    ({ next, old }) => ({
      stored: JSON.parse(localStorage.getItem(next)!),
      original: JSON.parse(localStorage.getItem(old)!),
    }),
    { next: newKey, old: oldKey },
  );
  expect(values.stored.ledger[0]).toMatchObject({
    received: 1,
    used: 0,
    stored: 10,
    unit: "tube",
    notes: "배양으로 1 tube → 10 tube",
  });
  expect(values.stored.ledger[1]).toEqual(legacy.ledger[0]);
  expect(values.original.ledger).toEqual(legacy.ledger);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 다운로드" }).click();
  const stream = await (await download).createReadStream();
  let csv = "";
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('"1","0","10","tube"');
  expect(csv).toContain("배양으로 1 tube → 10 tube");
  await page.goto("/demo/library");
  await expect(
    page.getByRole("heading", { name: "관리대장 작성 안내", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "수입신고 준비서류 체크리스트",
      exact: true,
    }),
  ).toBeVisible();
});
test("손상된 v2 데이터에 사용자 변경으로 덮어쓰지 않는다", async ({ page }) => {
  await page.addInitScript((key) => {
    if (!localStorage.getItem(key))
      localStorage.setItem(key, '{"version":2,"role":"missing"}');
  }, newKey);
  await page.goto("/demo");
  await role(page, "lmo_manager");
  await expect(
    page.getByRole("alert").filter({ hasText: "원본을 보호" }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), newKey)).toBe(
    '{"version":2,"role":"missing"}',
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "체험 데이터 초기화" }).click();
  await expect(
    page.getByRole("button", { name: "체험 데이터 초기화" }),
  ).toBeEnabled();
  const recovered = await page.evaluate(
    (key) => ({
      current: JSON.parse(localStorage.getItem(key)!),
      backups: Object.keys(localStorage)
        .filter((name) => name.startsWith(`${key}:recovery:`))
        .map((name) => localStorage.getItem(name)),
    }),
    newKey,
  );
  expect(recovered.backups).toContain('{"version":2,"role":"missing"}');
  expect(recovered.current.role).toBe("researcher");
  await role(page, "lmo_manager");
  await page.reload();
  await expect(page.getByLabel("체험 역할 전환")).toHaveValue("lmo_manager");
});
test("다른 탭에서 손상된 값이 저장돼도 원문을 덮어쓰지 않는다", async ({
  page,
  context,
}) => {
  await page.goto("/demo");
  await role(page, "lmo_manager");
  const other = await context.newPage();
  await other.goto("/demo");
  await other.evaluate(
    (key) => localStorage.setItem(key, "broken-from-another-tab"),
    newKey,
  );
  await expect(
    page.getByRole("alert").filter({ hasText: "다른 탭의 저장 데이터" }),
  ).toBeVisible();
  await role(page, "researcher");
  expect(await page.evaluate((key) => localStorage.getItem(key), newKey)).toBe(
    "broken-from-another-tab",
  );
  await other.close();
});
