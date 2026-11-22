import { defineConfig, devices } from "@playwright/test";

import {
  API_PORT,
  apiEnv,
  DROP_DATABASE,
  WEB_PORT,
} from "./e2e-api/environment.ts";

// The flows that need the real API: `bun run test:e2e:api`.
//
// They start their own API from ../fastapi_blog, on its own port and in its
// own database, so they never touch development data and a run always
// starts empty. Starting empty matters: the API allows ten sign-ups an hour
// from one address, and the count lives in the database.
//
// The API trusts the address its proxy (the app's preview server, on this
// machine) forwards, as behind a real proxy; e2e-api/fixtures.ts gives each
// test an address of its own that way. See there for why.
//
// Not run in CI yet: this repository's workflow has no API to start.

export default defineConfig({
  testDir: "./e2e-api",
  globalSetup: "./e2e-api/global-setup.ts",
  globalTeardown: "./e2e-api/global-teardown.ts",
  // One at a time: the tests share one API and its sign-up allowance.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `${DROP_DATABASE} && uv run --directory ../fastapi_blog fastapi dev --port ${API_PORT} --no-reload --forwarded-allow-ips 127.0.0.1`,
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: apiEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `bun run build && bunx vite preview --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { API_URL: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
