import { expect, type Page } from "@playwright/test";
export async function registerLocalUser(page: Page, name = "테스트 연구자") {
  const email = `test-${crypto.randomUUID()}@example.com`;
  const origin = `http://127.0.0.1:${process.env.TEST_PORT || "3100"}`;
  const response = await page.request.post("/api/prototype-auth/register", {
    headers: { origin }, data: { name, email, password: "test-password-123", role: "researcher" },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return email;
}
