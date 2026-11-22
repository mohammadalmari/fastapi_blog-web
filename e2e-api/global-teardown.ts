import { execSync } from "node:child_process";

import { DATABASE_NAME, DROP_DATABASE } from "../playwright.api.config.ts";

// Leave nothing behind: the run's accounts and sessions go with its database.
export default function globalTeardown() {
  execSync(DROP_DATABASE, {
    env: { ...process.env, DATABASE_NAME, FASTAPI_DEBUG: "true" },
    stdio: "inherit",
  });
}
