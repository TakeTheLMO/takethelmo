import { expect, test } from "@playwright/test";
import { registerLocalUser } from "./local-auth-helper";
test("admin searches users, reads submissions and attachments across browsers, corrects records and sees alerts", async ({ browser, baseURL }) => {
  test.setTimeout(60000);
  const ownerContext = await browser.newContext({ baseURL }), adminContext = await browser.newContext({ baseURL });
  try {
    const owner = await ownerContext.newPage(), admin = await adminContext.newPage();
    const email = await registerLocalUser(owner, "공유 검증 연구자");
    await owner.goto(`${baseURL}/mypage/requests`);
    await owner.getByRole("button", { name: "+ 새 신청서", exact: true }).click();
    await owner.getByLabel("신청 제목").fill("관리자 확인용 신청");
    await owner.getByLabel("신청 내용").fill("연구자가 등록한 원래 내용입니다.");
    await owner.getByRole("button", { name: "검토 요청 제출", exact: true }).click();
    await expect(owner.getByText("서버 저장 완료", { exact: true })).toBeVisible();
    await owner.goto(`${baseURL}/training/courses`);
    await owner.getByRole("button", { name: "교육과정·기록 추가" }).click();
    await owner.getByLabel("교육과정 이름").fill("하반기 연구실 안전교육");
    await owner.getByRole("button", { name: "교육과정 저장", exact: true }).click();
    const course = owner.locator("section").filter({ has: owner.getByRole("heading", { name: "하반기 연구실 안전교육", exact: true }) });
    await course.getByRole("button", { name: "이수증 등록", exact: true }).click();
    await course.getByLabel("첨부파일").setInputFiles({ name: "shared-proof.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5X8AAAAASUVORK5CYII=", "base64") });
    await course.getByRole("button", { name: "이수 기록 저장" }).click();
    await expect(course.getByText("등록 완료", { exact: true })).toBeVisible();
    await expect(owner.getByText("서버 저장 완료", { exact: true })).toBeVisible();
    const login = await admin.request.post(`${baseURL}/api/prototype-auth/login`, { headers: { origin: baseURL! }, data: { email: "admin", password: "admin" } });
    expect(login.ok()).toBeTruthy();
    await admin.goto(`${baseURL}/management/users`);
    await admin.getByLabel("사용자 검색").fill(email);
    await admin.getByRole("button").filter({ hasText: "공유 검증 연구자" }).click();
    await expect(admin.getByLabel("사용자 이메일")).toHaveValue(email);
    const record = admin.locator("details").filter({ has: admin.locator("summary").filter({ hasText: "관리자 확인용 신청" }) }).first();
    await record.locator("summary").first().click();
    await record.getByLabel("자료 내용").fill("관리자가 확인하여 정정한 내용입니다.");
    await record.getByLabel("자료 수정 사유").fill("연구자 요청에 따른 오탈자 정정");
    await record.getByRole("button", { name: "자료 수정 저장" }).click();
    await expect(admin.getByText("수정 내용과 이력을 저장했습니다.", { exact: true })).toBeVisible();
    const downloaded = admin.waitForEvent("download");
    await admin.getByRole("link", { name: /shared-proof.png/ }).click();
    expect((await downloaded).suggestedFilename()).toBe("shared-proof.png");
    await admin.getByLabel("관리자 참조 메모").fill("다음 검토 때 원본 첨부를 참조할 것");
    await admin.getByLabel("계정 수정 사유").fill("후속 검토 메모 추가");
    await admin.getByRole("button", { name: "계정 정보 저장" }).click();
    await expect(admin.getByText("수정 내용과 이력을 저장했습니다.", { exact: true })).toBeVisible();
    await record.locator("summary").first().click();
    await record.getByLabel("자료 수정 사유").fill("접수한 신청 검토를 시작합니다.");
    await record.getByRole("button", { name: "검토 시작", exact: true }).click();
    await expect(admin.getByText("수정 내용과 이력을 저장했습니다.", { exact: true })).toBeVisible();
    await record.locator("summary").first().click();
    await expect(record.getByRole("button", { name: "승인", exact: true })).toBeVisible();
    await record.getByLabel("자료 수정 사유").fill("내부 검토를 완료했습니다.");
    await record.getByRole("button", { name: "승인", exact: true }).click();
    await expect(admin.getByText("수정 내용과 이력을 저장했습니다.", { exact: true })).toBeVisible();
    await admin.evaluate(() => scrollTo(0, 0));
    await admin.screenshot({ path: "output/playwright/user-management.png", fullPage: true });
    await owner.goto(`${baseURL}/mypage/requests`); await owner.reload();
    await expect(owner.getByText("관리자가 확인하여 정정한 내용입니다.", { exact: true })).toBeVisible();
    await expect(owner.getByText("승인", { exact: true }).first()).toBeVisible();
    await admin.goto(`${baseURL}/mypage/notifications`);
    await expect(admin.getByRole("link", { name: /공유 검증 연구자 · 관리자 확인용 신청/ }).first()).toBeVisible();
    await expect(admin.getByRole("link", { name: /공유 검증 연구자 · shared-proof.png/ })).toBeVisible();
    await admin.goto(`${baseURL}/management/users`);
    await admin.getByRole("button", { name: "전체 등록 자료", exact: true }).click();
    await admin.getByLabel("사용자 등록 자료 검색", { exact: true }).fill("관리자 확인용 신청");
    await expect(admin.getByRole("link", { name: /관리자 확인용 신청/ }).first()).toBeVisible();
    await admin.setViewportSize({ width: 390, height: 844 });
    expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await admin.screenshot({ path: "output/playwright/user-management-mobile.png", fullPage: true });
  } finally { await ownerContext.close(); await adminContext.close(); }
});

test("ordinary accounts cannot search users, read alerts, edit others or download another account's attachments", async ({ page, baseURL }) => {
  await registerLocalUser(page);
  for (const query of ["view=users", "view=records", "view=activity", "user=another"]) expect((await page.request.get(`/api/account-data?${query}`)).status()).toBe(403);
  expect((await page.request.get("/api/account-files?user=another&id=one")).status()).toBe(403);
  expect((await page.request.post("/api/account-data", { headers: { origin: baseURL! }, data: { action: "profile", user: "another" } })).status()).toBe(403);
  await page.goto("/management/users"); await expect(page).toHaveURL(/\/mypage$/);
  await expect(page.getByRole("link", { name: "사용자·등록 자료 관리", exact: true })).toHaveCount(0);
});

test("server save failure retains local input and a stale save preserves the newer server edit", async ({ page, baseURL }) => {
  await registerLocalUser(page);
  await page.goto("/mypage/requests");
  await expect(page.getByText("서버 저장 완료", { exact: true })).toBeVisible();
  await page.route("**/api/account-data", async route => {
    if (route.request().method() === "POST") await route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"test storage failure"}' });
    else await route.continue();
  });
  await page.getByRole("button", { name: "+ 새 신청서", exact: true }).click();
  await page.getByLabel("신청 제목").fill("복구할 브라우저 입력");
  await page.getByLabel("신청 내용").fill("서버 저장 실패에도 보관할 내용");
  await page.getByRole("button", { name: "검토 요청 제출", exact: true }).click();
  await expect(page.getByText(/서버 저장 실패 · 브라우저 입력 유지/)).toBeVisible();
  const snapshot = await page.request.get("/api/account-data").then(response => response.json());
  snapshot.state.requests.push({ id: crypto.randomUUID(), title: "다른 창의 최신 자료", body: "최신 수정 내용", kind: "연구실 출입", owner: snapshot.state.role, status: "제출", history: [{ at: new Date().toISOString(), actor: "테스트 연구자", event: "제출", note: "다른 창의 입력" }] });
  expect((await page.request.post("/api/account-data", { headers: { origin: baseURL! }, data: { action: "save", revision: snapshot.revision, state: snapshot.state } })).ok()).toBeTruthy();
  await page.unroute("**/api/account-data");
  await page.getByRole("button", { name: "저장 재시도", exact: true }).click();
  await expect(page.getByText("다른 창의 최신 자료", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "저장 전 입력 다운로드", exact: true })).toBeVisible();
  const backup = await page.evaluate(() => Object.keys(localStorage).filter(key => key.endsWith(":conflict-backup")).map(key => localStorage.getItem(key)).join(""));
  expect(backup).toContain("복구할 브라우저 입력");
  const latest = await page.request.get("/api/account-data").then(response => response.json());
  expect(latest.state.requests.at(-1).title).toBe("다른 창의 최신 자료");
});

test("conflict recovery captures input typed during the latest-state request and retains earlier copies", async ({ page, baseURL }) => {
  test.setTimeout(60000);
  await registerLocalUser(page); await page.goto("/mypage/requests");
  await expect(page.getByText("서버 저장 완료", { exact: true })).toBeVisible();
  await page.evaluate(() => { const key = Object.keys(localStorage).find(key => key.startsWith("takethelmo:frontend-demo:v1:user:") && !key.includes(":pending"))!; localStorage.setItem(`${key}:conflict-backup`, JSON.stringify({ marker: "이전 복구 자료" })); });
  let releasePost!: () => void, markPost!: () => void, releaseGet!: () => void, markGet!: () => void;
  const postGate = new Promise<void>(resolve => { releasePost = resolve; }), postHeld = new Promise<void>(resolve => { markPost = resolve; });
  const getGate = new Promise<void>(resolve => { releaseGet = resolve; }), getHeld = new Promise<void>(resolve => { markGet = resolve; });
  let waitingPost = false, waitingGet = false;
  await page.route("**/api/account-data", async route => {
    if (route.request().method() === "POST" && !waitingPost) { waitingPost = true; markPost(); await postGate; }
    else if (route.request().method() === "GET" && waitingPost && !waitingGet) { waitingGet = true; markGet(); await getGate; }
    await route.continue();
  });
  await page.getByRole("button", { name: "+ 새 신청서", exact: true }).click();
  await page.getByLabel("신청 제목", { exact: true }).fill("보존할 새 신청"); await postHeld;
  await page.getByLabel("신청 내용", { exact: true }).fill("충돌 전 입력 내용");
  await page.getByRole("button", { name: "검토 요청 제출", exact: true }).click();
  const snapshot = await page.request.get("/api/account-data").then(r => r.json());
  snapshot.state.assessment = { animal: "예" };
  expect((await page.request.post("/api/account-data", { headers: { origin: baseURL! }, data: { action: "save", ...snapshot } })).ok()).toBeTruthy();
  releasePost(); await getHeld;
  await page.getByRole("button", { name: "+ 새 신청서", exact: true }).click();
  await page.getByLabel("신청 제목", { exact: true }).fill("GET 응답 대기 중 입력");
  releaseGet();
  await expect(page.getByText("다른 변경을 불러왔습니다. 저장 전 입력은 복구 사본에 보관했습니다.", { exact: true })).toBeVisible();
  const backups = await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes(":conflict-")).map(key => localStorage.getItem(key)).join("\n"));
  expect(backups).toContain("GET 응답 대기 중 입력"); expect(backups).toContain("보존할 새 신청"); expect(backups).toContain("이전 복구 자료");
  await page.unroute("**/api/account-data");
});
