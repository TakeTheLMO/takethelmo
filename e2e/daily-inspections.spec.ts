import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { registerLocalUser } from "./local-auth-helper";
test("일상점검 N/A, 관리자 확인·정정, 사용자 재확인 상태와 월간 파일", async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  const userContext = await browser.newContext({ baseURL }), adminContext = await browser.newContext({ baseURL });
  try {
    const user = await userContext.newPage(), admin = await adminContext.newPage();
    const email = await registerLocalUser(user, "일상점검 연구자");
    await user.goto("/safety/inspections");
    await user.getByRole("button", { name: "+ 점검 시작" }).click();
    await user.getByLabel("점검 연구실").fill("점검 화면 검증 연구실");
    await user.getByLabel("점검 방식").selectOption("na");
    await user.getByLabel("일일 미해당 사유", { exact: true }).fill("외부 일정으로 연구실 미사용, 기관 기준 확인 필요");
    await user.getByRole("button", { name: "점검 저장", exact: true }).click();
    await expect(user.getByText("서버 저장 완료", { exact: true })).toBeVisible();
    await expect(user.getByText("포털 관리자 확인 대기", { exact: true })).toBeVisible();
    const snapshot = await user.request.get("/api/account-data").then(r => r.json());
    expect(snapshot.state.inspections).toHaveLength(1);
    await admin.request.post("/api/prototype-auth/login", { headers: { origin: baseURL! }, data: { email: "admin", password: "admin" } });
    await admin.goto("/management/users?category=inspections");
    await admin.getByLabel("사용자 검색").fill(email);
    await admin.getByRole("button").filter({ hasText: "일상점검 연구자" }).click();
    const record = admin.locator("details").filter({ has: admin.locator("summary").filter({ hasText: "점검 화면 검증 연구실 일상점검" }) }).first();
    await record.locator("summary").first().click();
    // Another edit advances the account revision without changing the inspection being reviewed.
    const concurrent = await user.request.get("/api/account-data").then(r => r.json());
    concurrent.state.assessment = { animal: "모르겠어요" };
    expect((await user.request.post("/api/account-data", { headers: { origin: baseURL! }, data: { action: "save", ...concurrent } })).ok()).toBeTruthy();
    await record.getByLabel("자료 수정 사유").fill("기록 확인, 공식 승인과 별도");
    await record.getByRole("button", { name: "포털 관리자 확인", exact: true }).click();
    await expect(admin.getByText("수정 내용과 이력을 저장했습니다.", { exact: true })).toBeVisible();
    await user.reload(); await expect(user.getByText(/포털 관리자 확인 · .*admin 계정/)).toBeVisible();
    const download = user.waitForEvent("download");
    await user.getByRole("button", { name: "월간 점검표 다운로드" }).click();
    const file = await download, csv = await readFile((await file.path())!, "utf8");
    expect(csv.charCodeAt(0)).toBe(0xfeff); expect(csv).toContain("일상점검 연구자"); expect(csv).toContain("admin 계정"); expect(csv).toContain("daily-v1");
    await user.screenshot({ path: "output/playwright/daily-confirmed.png", fullPage: true });
    await user.getByRole("button", { name: "점검 정정", exact: true }).click();
    await user.getByLabel("점검 메모", { exact: true }).fill("미해당 사유 설명 보완");
    await user.getByLabel("점검 정정 사유", { exact: true }).fill("일정 확인");
    await user.getByRole("button", { name: "점검 저장", exact: true }).click();
    await expect(user.getByText("서버 저장 완료", { exact: true })).toBeVisible();
    await expect(user.getByText("포털 관리자 확인 대기", { exact: true })).toBeVisible();
    const changed = await user.request.get("/api/account-data").then(r => r.json());
    expect(changed.state.inspections[0].daily.history.map((h: { event: string }) => h.event)).toEqual(["점검 등록", "관리자 확인", "점검 정정"]);
    expect(changed.state.inspections[0].daily.confirmation).toBeUndefined();
    await user.setViewportSize({ width: 390, height: 844 });
    await user.evaluate(() => window.scrollTo(0, 0));
    expect(await user.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await user.screenshot({ path: "output/playwright/daily-mobile.png", fullPage: true });
    await user.goto("/mypage/notifications"); await expect(user.getByText(/관리자 처리 · .*점검 화면 검증 연구실/).first()).toBeVisible();
    const records = await admin.request.get("/api/account-data?view=records").then(r => r.json());
    await admin.goto("/portal");
    await expect(admin.getByRole("link", { name: /^미종결 개선조치/ })).toContainText(String(records.filter((r: { category: string; data: { status?: string } }) => r.category === "actions" && r.data.status !== "종결").length));
  } finally { await userContext.close(); await adminContext.close(); }
});

test("관리자 확인과 동시에 입력한 문의 초안을 최신 서버 상태 위에 보존한다", async ({ browser, baseURL }) => {
  test.setTimeout(60000);
  const ownerContext = await browser.newContext({ baseURL }), adminContext = await browser.newContext({ baseURL });
  try {
    const owner = await ownerContext.newPage(), admin = await adminContext.newPage();
    const email = await registerLocalUser(owner, "초안 동시 저장 검증");
    await owner.goto("/safety/inspections"); await owner.getByRole("button", { name: "+ 점검 시작" }).click();
    await owner.getByLabel("점검 연구실").fill("동시 저장 연구실"); await owner.getByLabel("점검 방식").selectOption("na");
    await owner.getByLabel("일일 미해당 사유", { exact: true }).fill("기록 확인용"); await owner.getByRole("button", { name: "점검 저장", exact: true }).click();
    await expect(owner.getByText("서버 저장 완료", { exact: true })).toBeVisible();
    await owner.goto("/lmo/inquiry"); await expect(owner.getByText("서버 저장 완료", { exact: true })).toBeVisible();
    const snapshot = await owner.request.get("/api/account-data").then(r => r.json());
    let release!: () => void, markHeld!: () => void, held = false;
    const gate = new Promise<void>(resolve => { release = resolve; }), waiting = new Promise<void>(resolve => { markHeld = resolve; });
    await owner.route("**/api/account-data", async route => {
      if (route.request().method() === "POST" && !held) { held = true; markHeld(); await gate; }
      await route.continue();
    });
    await owner.getByLabel("신청 제목").fill("관리자 확인 중에도 보존할 초안"); await waiting;
    await admin.request.post("/api/prototype-auth/login", { headers: { origin: baseURL! }, data: { email: "admin", password: "admin" } });
    const users = await admin.request.get(`/api/account-data?view=users&q=${encodeURIComponent(email)}`).then(r => r.json());
    const confirmed = await admin.request.post("/api/account-data", { headers: { origin: baseURL! }, data: { action: "record", user: users[0].id, category: "inspections", key: snapshot.state.inspections[0].id, revision: snapshot.revision, fields: { confirm: true }, reason: "동시 저장 중 점검 확인" } });
    expect(confirmed.ok(), await confirmed.text()).toBeTruthy(); release();
    await expect(owner.getByText("서버 저장 완료", { exact: true })).toBeVisible();
    await owner.unroute("**/api/account-data"); await owner.reload();
    await expect(owner.getByRole("button", { name: "저장 전 입력 다운로드", exact: true })).toHaveCount(0);
    await expect(owner.getByLabel("신청 제목")).toHaveValue("관리자 확인 중에도 보존할 초안");
    const result = await owner.request.get("/api/account-data").then(r => r.json());
    expect(result.state.inspections[0].daily.confirmation).toBeTruthy();
    expect(result.state.requestDrafts["researcher:IBC 사전 문의"].title).toBe("관리자 확인 중에도 보존할 초안");
  } finally { await ownerContext.close(); await adminContext.close(); }
});

test("회원가입은 업무 역할만 제공하고 모든 비관리자 역할의 관리 메뉴·API를 차단한다", async ({ page, baseURL }) => {
  await page.goto("/signup");
  await expect(page.getByLabel("역할").locator('option[value="super_admin"]')).toHaveCount(0);
  const forged = await page.request.post("/api/prototype-auth/register", { headers: { origin: baseURL! }, data: { name: "권한 위조", email: `forged-${crypto.randomUUID()}@example.test`, password: "password123", role: "super_admin" } });
  expect(forged.ok()).toBe(false);
  for (const role of ["researcher", "lab_manager", "lmo_manager", "safety_admin"]) {
    const response = await page.request.post("/api/prototype-auth/register", { headers: { origin: baseURL! }, data: { name: "업무 역할 확인", email: `${role}-${crypto.randomUUID()}@example.test`, password: "password123", role } });
    expect(response.ok(), await response.text()).toBeTruthy();
    for (const path of ["/api/account-data?view=users", "/api/account-data?view=records", "/api/account-data?view=files", "/api/account-data?view=activity", "/api/account-files?user=another&id=proof", "/api/portal-content?path=%2Fportal&manage=1"]) expect((await page.request.get(path)).status(), `${role}: ${path}`).toBe(403);
    for (const path of ["/management/users", "/management/menus"]) { await page.goto(path); await expect(page).toHaveURL(/\/mypage$/); }
    await expect(page.getByLabel("체험 역할 전환")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "사용자·등록 자료 관리", exact: true })).toHaveCount(0);
  }
});

test("LMO 대장은 보관위치·용량을 별도 저장하고 검색·정정·내보내기에 반영한다", async ({ page, baseURL }) => {
  const response = await page.request.post("/api/prototype-auth/register", { headers: { origin: baseURL! }, data: { name: "대장 담당자", email: `ledger-${crypto.randomUUID()}@example.test`, password: "password123", role: "lmo_manager" } });
  expect(response.ok()).toBeTruthy(); await page.goto("/lmo/ledger");
  await page.getByRole("button", { name: "기록 추가", exact: true }).click();
  await page.getByLabel("물질명", { exact: true }).fill("검증용 물질 기록"); await page.getByLabel("입고량", { exact: true }).fill("5");
  await page.getByLabel("보관 위치", { exact: true }).fill("선반 A"); await page.getByLabel("용기당 용량", { exact: true }).fill("1 vial당 1 ml");
  await page.getByRole("button", { name: "관리기록 저장", exact: true }).click(); await expect(page.getByText("서버 저장 완료", { exact: true })).toBeVisible();
  await page.getByLabel("물질명·보관위치 검색").fill("선반 B"); await expect(page.getByText("검색 조건에 맞는 관리기록이 없습니다.")).toBeVisible();
  await page.getByLabel("물질명·보관위치 검색").fill("선반 A"); await page.getByRole("button", { name: "기록 정정", exact: true }).click();
  await page.getByLabel("정정 보관 위치", { exact: true }).fill("선반 B"); await page.getByLabel("정정 사유", { exact: true }).fill("실제 보관 위치 정정");
  await page.getByRole("button", { name: "정정 저장", exact: true }).click(); await expect(page.getByText("서버 저장 완료", { exact: true })).toBeVisible();
  await page.getByLabel("물질명·보관위치 검색").fill("선반 B");
  await expect(page.getByText("보관 위치: 선반 B · 용기당 용량: 1 vial당 1 ml", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "CSV 다운로드", exact: true }).click();
  const file = await download, csv = await readFile((await file.path())!, "utf8");
  expect(csv).toContain("선반 B"); expect(csv).toContain("1 vial당 1 ml");
  const snapshot = await page.request.get("/api/account-data").then(r => r.json());
  expect(snapshot.state.ledger[0].revisions[0].actor).toBe("대장 담당자");
  expect(snapshot.state.ledger[0].revisions[0].before.storageLocation).toBe("선반 A");
});
