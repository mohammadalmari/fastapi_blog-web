import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const PASSWORD = "Tr4verse-lantern-quilt";

let made = 0;
function newAccount() {
  made += 1;
  const username = `e2e_${Date.now().toString(36)}_${made}`;
  return { username, email: `${username}@example.com`, password: PASSWORD };
}

type Account = ReturnType<typeof newAccount>;

async function createAccount(request: APIRequestContext) {
  const account = newAccount();
  const response = await request.post("/api/v1/auth/register", {
    data: account,
  });
  expect(response.status()).toBe(201);
  return account;
}

const header = (page: Page) => page.getByRole("navigation", { name: "Main" });
const accountLink = (page: Page, account: Account) =>
  header(page).getByRole("link", { name: account.username });
const logInLink = (page: Page) =>
  header(page).getByRole("link", { name: "Log in" });

async function logIn(page: Page, account: Account, identifier?: string) {
  await page.getByLabel("Email or username").fill(identifier ?? account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("signing up logs you in, a reload keeps you in, and logging out lasts", async ({
  page,
}) => {
  const account = newAccount();

  await page.goto("/register");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Username").fill(account.username);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(accountLink(page, account)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  await page.reload();
  await expect(accountLink(page, account)).toBeVisible();

  await header(page).getByRole("button", { name: "Log out" }).click();
  await expect(logInLink(page)).toBeVisible();

  await page.reload();
  await expect(logInLink(page)).toBeVisible();
  await expect(accountLink(page, account)).toBeHidden();
});

test("a private page sends a visitor to log in, then brings them back", async ({
  page,
  request,
}) => {
  const account = await createAccount(request);

  await page.goto("/settings/profile");

  await expect(page).toHaveURL(/\/login\?redirect=/);
  // The username works as well as the email.
  await logIn(page, account, account.username);

  await expect(page).toHaveURL(/\/settings\/profile$/);
  await expect(
    page.getByRole("heading", { level: 1, name: account.username })
  ).toBeVisible();
  await expect(page.getByText(account.email)).toBeVisible();
  // A new account is a reader: it may comment, and may not write posts.
  await expect(page.getByText("Comment on posts")).toBeVisible();
  await expect(page.getByText("Write posts")).toBeHidden();
});

test("a wrong password gets the one message, and no session", async ({
  page,
  request,
}) => {
  const account = await createAccount(request);

  await page.goto("/login");
  await logIn(page, { ...account, password: "not-the-password" });

  await expect(page.getByRole("alert")).toHaveText(
    "Incorrect email, username or password"
  );
  await expect(page).toHaveURL(/\/login/);
  await expect(logInLink(page)).toBeVisible();
});

test("a taken username says so under no field it can't name", async ({
  page,
  request,
}) => {
  const taken = await createAccount(request);
  const account = newAccount();

  await page.goto("/register");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Username").fill(taken.username);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByRole("alert")).toHaveText("Username already taken");
});

test("a weak password shows the API's reasons under the password field", async ({
  page,
}) => {
  const account = newAccount();

  await page.goto("/register");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Username").fill(account.username);
  await page.getByLabel("Password").fill("abc");
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByRole("alert")).toContainText(
    /at least \d+ characters/
  );
  await expect(page.getByLabel("Password")).toHaveAttribute(
    "aria-invalid",
    "true"
  );
});

// The API ends a session whose refresh cookie is used twice. Two tabs
// reloading at the same moment would each try to use it.
test("two tabs reloading together both stay logged in, and log out together", async ({
  context,
  page,
  request,
}) => {
  const account = await createAccount(request);
  await page.goto("/login");
  await logIn(page, account);
  await expect(accountLink(page, account)).toBeVisible();

  const second = await context.newPage();
  await second.goto("/");
  await expect(accountLink(second, account)).toBeVisible();

  for (let round = 0; round < 3; round += 1) {
    await Promise.all([page.reload(), second.reload()]);
    await expect(accountLink(page, account)).toBeVisible();
    await expect(accountLink(second, account)).toBeVisible();
  }

  await header(page).getByRole("button", { name: "Log out" }).click();

  await expect(logInLink(page)).toBeVisible();
  // No reload: the first tab told it.
  await expect(logInLink(second)).toBeVisible();
});

test("a login link can't send you to another site afterwards", async ({
  page,
  request,
}) => {
  const account = await createAccount(request);

  await page.goto("/login?redirect=https%3A%2F%2Fevil.example%2Fsteal");
  await logIn(page, account);

  await expect(accountLink(page, account)).toBeVisible();
  expect(new URL(page.url()).origin).toBe("http://localhost:4174");
  await expect(page).toHaveURL(/\/$/);
});
