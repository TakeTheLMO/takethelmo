import { expect, test } from "@playwright/test";
import { registerLocalUser } from "./local-auth-helper";

test("기존 데모 링크가 포털로 이동하고 신규 계정에 예제를 만들지 않는다", async ({ page }) => {
  await registerLocalUser(page);
  await page.goto("/demo"); await expect(page).toHaveURL(/\/mypage$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("나의 업무 현황");
  await expect(page.getByLabel("체험 역할 전환")).toHaveCount(0);
  await expect(page.getByText("가상 데이터 체험", { exact: true })).toHaveCount(0);
  await page.goto("/demo/requests"); await expect(page).toHaveURL(/\/mypage\/requests$/);
  const snapshot = await page.request.get("/api/account-data").then(r => r.json());
  expect(snapshot.state.requests).toHaveLength(0); expect(snapshot.state.courses).toHaveLength(0); expect(snapshot.state.members).toHaveLength(0);
});

test("문의 초안 복원과 네 확인 응답 자동 연결", async ({ page }) => {
  await registerLocalUser(page); await page.goto("/lmo/inquiry");
  await page.getByLabel("신청 제목").fill("IBC 확인 문의");
  await page.getByLabel("5. 실험 개요·문의 사항").fill("기관에서 확인할 절차를 안내받고 싶습니다.");
  await expect(page.getByText("서버 저장 완료", { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByLabel("신청 제목")).toHaveValue("IBC 확인 문의");
  await page.goto("/lmo/assessment");
  for (const field of await page.locator("fieldset").all()) await field.getByLabel("아니요", { exact: true }).check();
  await page.getByRole("button", { name: "확인할 항목 정리하기" }).click();
  await page.getByRole("button", { name: "IBC 사전 문의 작성", exact: true }).click();
  await expect(page).toHaveURL(/\/mypage\/requests\?kind=ibc/);
  await expect(page.getByLabel("신청 제목")).toHaveValue("IBC 확인 문의");
  await page.getByLabel("1. 실험 유형").fill("진행 전 절차 확인");
  await page.getByLabel("2. 사용 물질").fill("물질명 확인 중");
  await page.getByLabel("시작 시기 미정").check();
  await page.getByRole("button", { name: "사전 문의 제출", exact: true }).click();
  await expect(page.getByRole("heading", { name: "IBC 확인 문의", exact: true })).toBeVisible();
  await expect(page.getByText("서버 저장 완료", { exact: true })).toBeVisible();
  const snapshot = await page.request.get("/api/account-data").then(r => r.json());
  expect(Object.keys(snapshot.state.requests[0].inquiry.assessment)).toHaveLength(4);
  expect(snapshot.state.requestDrafts["researcher:IBC 사전 문의"]).toBeUndefined();
});

test("서버에서 사용자 자기 승인을 거부한다", async ({ page, baseURL }) => {
  await registerLocalUser(page); await page.goto("/mypage/requests");
  await page.getByRole("button", { name: "+ 새 신청서", exact: true }).click();
  await page.getByLabel("신청 제목").fill("권한 확인 신청"); await page.getByLabel("신청 내용").fill("담당자 검토를 요청합니다.");
  await page.getByRole("button", { name: "검토 요청 제출", exact: true }).click();
  await expect(page.getByText("서버 저장 완료", { exact: true })).toBeVisible();
  const snapshot = await page.request.get("/api/account-data").then(r => r.json()); snapshot.state.requests[0].status = "승인";
  expect((await page.request.post("/api/account-data", { headers: { origin: baseURL! }, data: { action: "save", ...snapshot } })).status()).toBe(403);
  const latest = await page.request.get("/api/account-data").then(r => r.json()); expect(latest.state.requests[0].status).toBe("제출");
});

test("안전점검 저장 시 실제 계정의 개선조치와 이력이 생성된다", async ({ page }) => {
  await registerLocalUser(page); await page.goto("/safety/inspections");
  await page.getByRole("button", { name: "+ 점검 시작" }).click();
  await page.getByLabel("점검 연구실").fill("점검 검증 연구실");
  const fields = page.locator("fieldset");
  for (let index = 0; index < await fields.count(); index++) await fields.nth(index).getByLabel(index === 0 ? "불량" : "양호", { exact: true }).check();
  await page.getByLabel("조치사항 1 (필수)", { exact: true }).fill("게시 상태를 보완해야 합니다.");
  await page.getByRole("button", { name: /점검 저장/ }).click();
  await expect(page.getByText("서버 저장 완료", { exact: true })).toBeVisible();
  const snapshot = await page.request.get("/api/account-data").then(r => r.json());
  expect(snapshot.state.inspections).toHaveLength(1); expect(snapshot.state.actions).toHaveLength(1);
  expect(snapshot.state.actions[0].history[0].actor).toBe("테스트 연구자");
  expect(snapshot.state.inspections[0].inspector).toBe("테스트 연구자");
});

test("자료실과 검색, AI 미연결 표시를 제공한다", async ({ page }) => {
  await registerLocalUser(page); await page.goto("/library/forms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("문서 서식");
  await page.goto("/support/search?q=LMO"); await expect(page.getByLabel("검색어")).toHaveValue("LMO");
  await page.goto("/support/assistant"); await expect(page.getByText("참고 안내 · AI 미연결", { exact: true })).toBeVisible();
});

test("피드백 반영: 자료실 분류, IBC 문의 경로와 상태 안내, 점검 서류 링크", async ({ page }) => {
  await registerLocalUser(page);
  await page.goto("/library/forms");
  await expect(page.getByRole("button", { name: "서식", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "연구실·시설 변경 검토 요청서" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "신규 연구원 출입 절차 안내" })).toHaveCount(0);
  await page.getByRole("button", { name: "전체", exact: true }).click();
  await expect(page.getByRole("heading", { name: "신규 연구원 출입 절차 안내" })).toBeVisible();
  await page.goto("/lmo/assessment");
  await page.getByRole("link", { name: "IBC 사전 문의 바로 작성" }).click();
  await expect(page).toHaveURL(/\/lmo\/inquiry$/);
  await expect(page.getByText("작성 전에 준비하면 좋은 정보")).toBeVisible();
  await expect(page.getByText("사전 문의는 이렇게 진행돼요")).toBeVisible();
  await page.goto("/safety/inspections");
  await page.getByRole("link", { name: /연구실 일상점검 운영 예시/ }).click();
  await expect(page).toHaveURL(/\/library\/laws\?doc=policy-safety$/);
  await expect(page.getByRole("button", { name: "예제 문서 다운로드" })).toBeVisible();
});

test("모바일 포털과 업무 메뉴에 가로 넘침이 없다", async ({ page }) => {
  await registerLocalUser(page); await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/portal", "/mypage", "/mypage/requests", "/training/courses", "/labs", "/safety/inspections", "/lmo/ledger", "/lmo/assessment", "/library/manuals", "/support/guides", "/mypage/notifications"]) {
    await page.goto(path); await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
  await page.goto("/portal"); await page.screenshot({ path: "output/playwright/portal-mobile.png", fullPage: true });
});
