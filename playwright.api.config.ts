import { defineConfig, devices } from "@playwright/test";

// The flows that need the real API: `bun run test:e2e:api`.
//
// They start their own API from ../fastapi_blog, on its own port and in its
// own database, so they never touch development data and a run always
// starts empty. Starting empty matters: the API allows ten sign-ups an hour
// from one address, and the count lives in the database.
//
// Not run in CI yet: this repository's workflow has no API to start.

const WEB_PORT = 4174;
const API_PORT = 8010;
export const DATABASE_NAME = "e2e_draftwork_web";

const apiEnv = {
  DATABASE_NAME,
  // Development mode: the refresh cookie isn't marked Secure, so it works
  // over plain http, and passwords need eight characters, not twelve.
  FASTAPI_DEBUG: "true",
};

// Refuses any database whose name doesn't start with "e2e_": the address
// comes from the API's own settings, and this must never drop a real one.
export const DROP_DATABASE = [
  "uv run --directory ../fastapi_blog python -c",
  `"from pymongo import MongoClient;`,
  `from app.core.settings import get_settings;`,
  `s = get_settings();`,
  `assert s.database_name.startswith('e2e_'), s.database_name;`,
  `MongoClient(s.database_url.get_secret_value()).drop_database(s.database_name)"`,
].join(" ");

export default defineConfig({
  testDir: "./e2e-api",
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
      command: `${DROP_DATABASE} && uv run --directory ../fastapi_blog fastapi dev --port ${API_PORT} --no-reload`,
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
