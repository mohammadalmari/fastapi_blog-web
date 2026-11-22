import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const PASSWORD = "Tr4verse-lantern-quilt";

// The API allows ten sign-ups an hour from one address, and a whole run
// comes from one. Use the shared accounts in people.ts; make one here only
// when signing up is the thing under test.
let made = 0;
export function newAccount() {
  made += 1;
  const username = `e2e_${Date.now().toString(36)}_${made}`;
  return { username, email: `${username}@example.com`, password: PASSWORD };
}

export type Account = ReturnType<typeof newAccount>;

export async function createAccount(request: APIRequestContext) {
  const account = newAccount();
  const response = await request.post("/api/v1/auth/register", {
    data: account,
  });
  expect(response.status(), await response.text()).toBe(201);
  const { id } = await response.json();
  return { ...account, id: id as string };
}

export type CreatedAccount = Awaited<ReturnType<typeof createAccount>>;

/**
 * Give an account one of the roles the seed command creates ("author",
 * "editor", "moderator"), on top of the reader role it has. `adminToken`
 * is an administrator's: nobody hands out a role they don't hold.
 */
export async function giveRole(
  request: APIRequestContext,
  adminToken: string,
  account: CreatedAccount,
  roleName: string
) {
  const headers = { Authorization: `Bearer ${adminToken}` };
  const listed = await request.get("/api/v1/roles", { headers });
  expect(listed.status(), await listed.text()).toBe(200);
  const roles: Array<{ id: string; name: string }> = await listed.json();
  const wanted = roles.filter((role) =>
    ["reader", roleName].includes(role.name)
  );
  expect(wanted.map((role) => role.name)).toContain(roleName);

  const assigned = await request.put(`/api/v1/users/${account.id}/roles`, {
    headers,
    data: { role_ids: wanted.map((role) => role.id) },
  });
  expect(assigned.status(), await assigned.text()).toBe(200);
}

/** An access token for the account, for setting things up through the API. */
export async function tokenFor(request: APIRequestContext, account: Account) {
  const response = await request.post("/api/v1/auth/login", {
    form: { username: account.email, password: account.password },
  });
  expect(response.status(), await response.text()).toBe(200);
  const { access_token } = await response.json();
  return access_token as string;
}

export const header = (page: Page) =>
  page.getByRole("navigation", { name: "Main" });
export const accountLink = (page: Page, account: Account) =>
  header(page).getByRole("link", { name: account.username });
export const logInLink = (page: Page) =>
  header(page).getByRole("link", { name: "Log in" });

/** Fill and send the login form the page is showing. */
export async function logIn(page: Page, account: Account, identifier?: string) {
  await page.getByLabel("Email or username").fill(identifier ?? account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Log in" }).click();
}
