import { expect, test, type Page } from "@playwright/test";
const png = {
  name: "demo-evidence.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5X8AAAAASUVORK5CYII=",
    "base64",
  ),
};
async function role(page: Page, value: string) {
  await page.getByLabel("체험 역할 전환").selectOption(value);
}
test("신청 보완 요청, 재제출, 승인과 새로고침 이력", async ({ page }) => {
  await page.goto("/demo/requests");
  await page.getByRole("button", { name: "+ 새 신청서", exact: true }).click();
  await page.getByLabel("신청 제목").fill("테스트 출입 검토");
  await page.getByLabel("신청 내용").fill("출입 전 필요한 확인을 요청합니다.");
  await page
    .getByRole("button", { name: "검토 요청 제출", exact: true })
    .click();
  const card = page.locator("section").filter({
    has: page.getByRole("heading", { name: "테스트 출입 검토", exact: true }),
  });
  await expect(card.getByRole("button", { name: "검토 시작" })).toHaveCount(0);
  await role(page, "safety_admin");
  await card.getByRole("button", { name: "검토 시작", exact: true }).click();
  await card.getByLabel("처리 결과").selectOption("보완 요청");
  await card.getByLabel("검토 의견").fill("교육 정보를 추가해 주세요.");
  await card
    .getByRole("button", { name: "검토 결과 저장", exact: true })
    .click();
  await role(page, "researcher");
  await card.getByLabel("보완한 신청 내용").fill("교육 정보를 추가했습니다.");
  await card.getByLabel("보완 설명").fill("요청 내용 반영");
  await card
    .getByRole("button", { name: "보완 후 재제출", exact: true })
    .click();
  await role(page, "safety_admin");
  await card.getByRole("button", { name: "검토 시작", exact: true }).click();
  await card.getByLabel("검토 의견").fill("정보 확인 완료");
  await card
    .getByRole("button", { name: "검토 결과 저장", exact: true })
    .click();
  await page.reload();
  await expect(
    card.locator("span").filter({ hasText: /^승인$/ }),
  ).toBeVisible();
  await card.locator("summary").click();
  await expect(card.getByText("보완 후 재제출", { exact: true })).toBeVisible();
  await expect(card.getByText("정보 확인 완료", { exact: true })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});
test("LMO 역할 범위와 반려 의견", async ({ page }) => {
  await page.goto("/demo/requests");
  await role(page, "lmo_manager");
  await expect(
    page.getByRole("heading", { name: "공동장비실 출입 검토 요청" }),
  ).toHaveCount(0);
  const card = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "LMO 시설 담당자 변경 확인",
      exact: true,
    }),
  });
  await card.getByRole("button", { name: "검토 시작" }).click();
  await card.getByLabel("처리 결과").selectOption("반려");
  await card.getByLabel("검토 의견").fill("변경 대상 확인이 필요합니다.");
  await card.getByRole("button", { name: "검토 결과 저장" }).click();
  await expect(
    card.locator("span").filter({ hasText: /^반려$/ }),
  ).toBeVisible();
});
test("이수증 원본 보존, 이력과 대시보드 반영", async ({ page }) => {
  await page.goto("/demo/training");
  const card = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "하반기 연구실 안전교육",
      exact: true,
    }),
  });
  await card.getByRole("button", { name: "이수증 등록", exact: true }).click();
  await card.getByLabel("첨부파일").setInputFiles(png);
  await card.getByRole("button", { name: "이수 기록 저장" }).click();
  await expect(card.getByText("등록 완료", { exact: true })).toBeVisible();
  await page.reload();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "첨부 다운로드 · demo-evidence.png" })
    .click();
  expect((await downloaded).suggestedFilename()).toBe("demo-evidence.png");
  await page.goto("/demo");
  await expect(page.getByText("1 / 3", { exact: true })).toBeVisible();
  await page.goto("/demo/notifications");
  await expect(
    page.getByText("하반기 연구실 안전교육 이수증을 등록해 주세요", {
      exact: true,
    }),
  ).toHaveCount(0);
});
test("부적합 점검 → 증빙 → 다른 담당자 검토 → 종결", async ({ page }) => {
  await page.goto("/demo/inspections");
  await page.getByRole("button", { name: "+ 점검 시작" }).click();
  const fields = page.locator("fieldset");
  for (let i = 0; i < 5; i++)
    await fields
      .nth(i)
      .getByLabel(i === 0 ? "부적합" : "적합", { exact: true })
      .check();
  await page
    .getByLabel("부적합 내용 (필수)")
    .fill("가상 통로의 적치물 정리가 필요합니다.");
  await page.getByRole("button", { name: /점검 저장/ }).click();
  const card = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "출입·대피 통로 개선",
      exact: true,
    }),
  });
  await card.getByLabel("조치 내용").fill("정리를 완료하고 증빙을 첨부합니다.");
  await card.getByLabel("첨부파일").setInputFiles(png);
  await card.getByRole("button", { name: "조치 완료 및 검토 요청" }).click();
  await expect(
    card.locator("span").filter({ hasText: /^검토 대기$/ }),
  ).toBeVisible();
  await role(page, "lab_manager");
  await card.getByLabel("개선조치 검토 의견").fill("사진 확인 완료");
  await card.getByRole("button", { name: "개선조치 검토 저장" }).click();
  await expect(
    card.locator("span").filter({ hasText: /^종결$/ }),
  ).toBeVisible();
});
test("아차사고 접수와 관리자 후속 처리", async ({ page }) => {
  await page.goto("/demo/incidents");
  await page.getByRole("button", { name: "+ 사고·아차사고 기록" }).click();
  await page.getByLabel("발생 일시").fill("2026-01-01T10:30");
  await page.getByLabel("제목", { exact: true }).fill("가상 미끄러짐 아차사고");
  await page.getByLabel("발생 장소").fill("가상 복도");
  await page
    .getByLabel("발생 상황과 현재 조치")
    .fill("안전이 확보된 가상 상황입니다.");
  await page.getByRole("button", { name: "사고 기록 접수" }).click();
  await role(page, "safety_admin");
  await page.getByLabel("후속 조치 의견").fill("현장 상황 확인");
  await page.getByRole("button", { name: "확인 시작" }).click();
  await page.getByLabel("후속 조치 의견").fill("후속 확인 완료");
  await page.getByRole("button", { name: "후속 조치 완료 및 종결" }).click();
  await page.reload();
  await expect(
    page.locator("span").filter({ hasText: /^종결$/ }),
  ).toBeVisible();
});
test("통합 검색, 문서 원문과 즐겨찾기 다운로드", async ({ page }) => {
  await page.goto("/demo/search?q=출입");
  await expect(
    page.getByRole("heading", { name: "신규 연구원 첫 출입 체크리스트" }),
  ).toBeVisible();
  await page.getByLabel("검색어", { exact: true }).fill("없는문서검색");
  await expect(page.getByText(/일치하는 자료가 없습니다/)).toBeVisible();
  await page.goto("/demo/library?doc=form-change");
  await expect(
    page.getByText("[체험용 서식 · 공식 제출 불가]", { exact: false }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "예제 문서 다운로드" }).click();
  expect((await download).suggestedFilename()).toContain(".txt");
  await page
    .getByRole("button", { name: "연구실·시설 변경 검토 요청서 즐겨찾기" })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "연구실·시설 변경 검토 요청서 즐겨찾기" }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("도우미 답변 근거와 모르는 질문 처리", async ({ page }) => {
  await page.goto("/demo/assistant");
  await page.getByLabel("도우미에게 질문").fill("교육 이수증");
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await expect(
    page.getByRole("link", { name: "교육 이수 기록 등록 안내" }),
  ).toBeVisible();
  await page.getByLabel("도우미에게 질문").fill("일기예보");
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await expect(page.getByText(/이 질문의 근거를 찾지 못했어요/)).toBeVisible();
});
test("상황별 단계 진행 저장과 LMO 확인 목록", async ({ page }) => {
  await page.goto("/demo/guides");
  await page.getByLabel("확인했어요").first().check();
  await page.reload();
  await expect(page.getByLabel("확인했어요").first()).toBeChecked();
  await page.goto("/demo/assessment");
  for (let i = 0; i < 4; i++)
    await page.locator("fieldset").nth(i).getByLabel("모르겠어요").check();
  await page.getByRole("button", { name: "확인할 항목 정리하기" }).click();
  await expect(
    page.getByText("추가 정보 확인이 필요해요", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "확인 목록 다운로드" }).click();
  expect((await download).suggestedFilename()).toContain("사전확인");
  await page
    .getByRole("link", { name: "시설 변경 검토 요청", exact: true })
    .click();
  await expect(page.getByLabel("신청 유형")).toHaveValue("LMO 시설 변경");
});
test("구성원 비활성화와 LMO 관리기록 저장", async ({ page }) => {
  await page.goto("/demo/labs");
  await page.getByRole("button", { name: "구성원", exact: true }).click();
  await expect(page.getByRole("button", { name: "구성원 추가" })).toHaveCount(
    0,
  );
  await role(page, "lab_manager");
  await page.getByRole("button", { name: "구성원 추가" }).click();
  await page.getByLabel("구성원 이름").fill("가상신입");
  await page.getByRole("button", { name: "구성원 저장" }).click();
  await expect(page.getByText("가상신입", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "비활성화", exact: true })
    .last()
    .click();
  await expect(page.getByText("비활성", { exact: true })).toBeVisible();
  await role(page, "lmo_manager");
  await page.getByRole("button", { name: "관리대장", exact: true }).click();
  await page.getByRole("button", { name: "기록 추가" }).click();
  await page.getByLabel("물질명", { exact: false }).fill("가상 관리항목 B");
  await page.getByLabel("입고량", { exact: true }).fill("2");
  await page.getByRole("button", { name: "관리기록 저장" }).click();
  await expect(
    page.getByText("가상 관리항목 B", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 다운로드" }).click();
  expect((await download).suggestedFilename()).toContain(".csv");
});
test("알림 읽음 상태 저장", async ({ page }) => {
  await page.goto("/demo/notifications");
  await page.getByRole("button", { name: "모두 읽음" }).click();
  await page.getByLabel("읽지 않은 알림만").check();
  await expect(page.getByText("확인할 알림이 없습니다.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "모두 읽음" })).toBeDisabled();
});
test("잘못된 저장 데이터를 안내하고 복구", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "takethelmo:frontend-demo:v1",
      '{"version":1,"role":"missing"}',
    ),
  );
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "나의 안전 현황", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "저장된 데모" }),
  ).toContainText("저장된 데모 데이터를 읽지 못했습니다");
});
test("모바일 전체 화면의 가로 넘침과 메뉴 탐색", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const slug of [
    "",
    "training",
    "requests",
    "notifications",
    "assistant",
    "search",
    "guides",
    "assessment",
    "library",
    "inspections",
    "incidents",
    "labs",
    "emergency",
  ]) {
    await page.goto(`/demo${slug ? `/${slug}` : ""}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      slug,
    ).toBe(true);
  }
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await page.getByRole("link", { name: "신청·검토", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "신청·검토", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
