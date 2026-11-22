import { writeFileSync } from "node:fs";
import type { FullConfig } from "@playwright/test";
import { request as playwrightRequest } from "@playwright/test";

import { createAccount, giveRole, tokenFor } from "./accounts.ts";
import { promoteToAdmin } from "./environment.ts";
import type { People } from "./people.ts";
import { PEOPLE_FILE } from "./people.ts";

// Runs once, after the API and the app have started and before any test.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL;
  const request = await playwrightRequest.newContext({ baseURL });

  const admin = await createAccount(request);
  // Nobody can give themselves a role through the API; the seed command
  // makes the first administrator, who can then give roles to the others.
  promoteToAdmin(admin.email);
  const adminToken = await tokenFor(request, admin);

  const author = await createAccount(request);
  await giveRole(request, adminToken, author, "author");
  const reader = await createAccount(request);

  const made: People = { admin, author, reader };
  writeFileSync(PEOPLE_FILE, JSON.stringify(made, null, 2));
  await request.dispose();
}
