import { defineConfig } from "@playwright/test";

const port = process.env.TEST_PORT || "3100";
export default defineConfig({
  testDir: "./e2e",
  // Shared admin account and server data are tested in a deterministic order.
  workers: 1,
  webServer: {
    // .env 에 배포용 PORTAL_DATABASE_URL 이 있어도 E2E 는 항상 로컬 SQLite 를 쓴다 (배포 DB 오염 방지).
    env: { LOCAL_AUTH_DB_PATH: process.env.LOCAL_AUTH_DB_PATH || "data/e2e-auth.sqlite", PORTAL_DATABASE_URL: "", PORTAL_ADMIN_PASSWORD: "" },
    command: `npm run start -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure",
  },
});
