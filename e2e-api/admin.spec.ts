import type { Browser, Page } from "@playwright/test";

import type { CreatedAccount } from "./accounts.ts";
import { createAccount, header, logIn, logInLink } from "./accounts.ts";
import { addressFor, expect, test } from "./fixtures.ts";
import type { People } from "./people.ts";
import { people } from "./people.ts";

// What an administrator does to other accounts and to roles. One account
// of its own, "subject", to change and switch off: the shared ones must
// stay as the other specs expect them. In order, each test leaving things
// as the next finds them.
test.describe.configure({ mode: "serial" });

let who: People;
let subject: CreatedAccount;
const ROLE = "e2e_gatekeeper";
const NOT_FOUND = "Nothing is written here";

test.beforeAll(async ({ playwright, baseURL }) => {
  who = people();
  const request = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: addressFor(import.meta.url),
  });
  subject = await createAccount(request);
  await request.dispose();
});

async function open(page: Page, account: CreatedAccount, path: string) {
  await page.goto(`/login?redirect=${path}`);
  await logIn(page, account);
  await expect(page).toHaveURL((url) => url.pathname === path);
}

async function asSomeoneElse(
  browser: Browser,
  baseURL: string | undefined,
  headers: Record<string, string>,
  account: CreatedAccount,
  path: string
) {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: headers,
  });
  const page = await context.newPage();
  await open(page, account, path);
  return { context, page };
}

const row = (page: Page, account: CreatedAccount) =>
  page.getByRole("article", { name: account.username, exact: true });

const box = (page: Page, name: RegExp) => page.getByRole("checkbox", { name });

test("an administrator creates a role and gives it to someone", async ({
  page,
}) => {
  await open(page, who.admin, "/admin/roles");
  await page.getByRole("link", { name: "New role" }).click();

  await page.getByLabel("Name", { exact: true }).fill("E2E_Gatekeeper");
  await page.getByLabel("Description").fill("Hands out roles.");
  for (const permission of [
    "users:read:any",
    "users:assign_roles",
    "users:deactivate",
    "roles:read",
  ]) {
    await box(page, new RegExp(`${permission}$`)).check();
  }
  await page.getByRole("button", { name: "Create role" }).click();

  // Stored in lowercase, listed, and opened.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ROLE);
  await expect(
    page.getByRole("navigation", { name: "Roles" }).getByRole("link", {
      name: ROLE,
    })
  ).toBeVisible();

  // Given to the subject, on top of the reader role they have.
  await page
    .getByRole("navigation", { name: "Administration" })
    .getByRole("link", { name: "Accounts" })
    .click();
  await row(page, subject)
    .getByRole("button", { name: "Change roles" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: `Roles of ${subject.username}`,
  });
  await dialog.getByRole("checkbox", { name: new RegExp(`^${ROLE}`) }).check();
  await dialog.getByRole("button", { name: "Save roles" }).click();

  await expect(dialog).toBeHidden();
  await expect(row(page, subject)).toContainText(`Roles: ${ROLE}, reader`);
});

test("someone who may hand out roles can't hand out more than they hold", async ({
  visitor,
  browser,
  baseURL,
}) => {
  const { context, page } = await asSomeoneElse(
    browser,
    baseURL,
    visitor(),
    subject,
    "/admin/users"
  );

  await expect(header(page).getByRole("link", { name: "Admin" })).toBeVisible();
  await row(page, who.reader)
    .getByRole("button", { name: "Change roles" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("checkbox", { name: /^admin/ })).toBeDisabled();
  await expect(
    dialog.getByRole("checkbox", { name: /^author/ })
  ).toBeDisabled();
  await expect(dialog.getByRole("checkbox", { name: /^reader/ })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // An administrator holds more than they do: no switching them off.
  await expect(
    row(page, who.admin).getByRole("button", { name: "Deactivate" })
  ).toBeHidden();

  // Roles can be looked at, not changed; and there is no page to make one.
  await page.goto("/admin/roles");
  await page
    .getByRole("navigation", { name: "Roles" })
    .getByRole("link", { name: ROLE })
    .click();
  await expect(
    page.getByText("You can look at roles but not change them.")
  ).toBeVisible();
  await expect(page.getByLabel("Description")).toBeDisabled();
  await page.goto("/admin/roles/new");
  await expect(page.getByRole("heading", { name: NOT_FOUND })).toBeVisible();

  await context.close();
});

test("the last administrator can't take away their own admin role, or switch themselves off", async ({
  page,
}) => {
  await open(page, who.admin, "/admin/users");
  const mine = row(page, who.admin);

  await expect(mine.getByRole("button", { name: "Deactivate" })).toBeHidden();
  await mine.getByRole("button", { name: "Change roles" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: /^admin/ }).uncheck();
  await dialog.getByRole("button", { name: "Save roles" }).click();

  await expect(dialog.getByRole("alert")).toHaveText(
    "This would leave no active admin"
  );
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(mine).toContainText("Roles: admin");
});

test("a deactivated account is logged out, loses its profile, and comes back when reactivated", async ({
  visitor,
  page,
  browser,
  baseURL,
}) => {
  const elsewhere = await asSomeoneElse(
    browser,
    baseURL,
    visitor(),
    subject,
    "/"
  );

  await open(page, who.admin, "/admin/users");
  await row(page, subject).getByRole("button", { name: "Deactivate" }).click();
  await page
    .getByRole("alertdialog", { name: `Deactivate ${subject.username}?` })
    .getByRole("button", { name: "Deactivate account" })
    .click();
  await expect(row(page, subject)).toContainText("Deactivated");

  // Listed among the deactivated, and nowhere else to be seen.
  await page.getByRole("link", { name: "Deactivated", exact: true }).click();
  await expect(row(page, subject)).toBeVisible();
  await expect(row(page, who.reader)).toBeHidden();

  await elsewhere.page.reload();
  await expect(logInLink(elsewhere.page)).toBeVisible();
  await elsewhere.page.goto(`/users/${subject.username}`);
  await expect(
    elsewhere.page.getByRole("heading", { name: NOT_FOUND })
  ).toBeVisible();

  await row(page, subject).getByRole("button", { name: "Reactivate" }).click();
  await expect(row(page, subject)).toBeHidden();
  await page.getByRole("link", { name: "Active", exact: true }).click();
  await expect(row(page, subject)).toBeVisible();

  await elsewhere.page.goto(`/login?redirect=/users/${subject.username}`);
  await logIn(elsewhere.page, subject);
  await expect(
    elsewhere.page.getByRole("heading", { level: 1, name: subject.username })
  ).toBeVisible();
  await elsewhere.context.close();
});

test("the default role moves to another, and back; a built-in role can't be renamed or deleted", async ({
  page,
}) => {
  await open(page, who.admin, "/admin/roles");
  const roles = page.getByRole("navigation", { name: "Roles" });

  await roles.getByRole("link", { name: /^reader/ }).click();
  await expect(page.getByLabel("Name", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Delete role" })).toBeHidden();
  await expect(
    page.getByRole("checkbox", { name: "Give this role to new accounts" })
  ).toBeDisabled();

  await roles.getByRole("link", { name: ROLE }).click();
  await page
    .getByRole("checkbox", { name: "Give this role to new accounts" })
    .check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(roles.getByRole("link", { name: ROLE })).toContainText(
    "default"
  );
  await expect(roles.getByRole("link", { name: /^reader/ })).not.toContainText(
    "default"
  );

  // Every later sign-up in this run expects the reader role: put it back.
  await roles.getByRole("link", { name: /^reader/ }).click();
  await page
    .getByRole("checkbox", { name: "Give this role to new accounts" })
    .check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(roles.getByRole("link", { name: /^reader/ })).toContainText(
    "default"
  );
});

test("deleting a role takes it from everyone who held it", async ({ page }) => {
  await open(page, who.admin, "/admin/roles");
  await page
    .getByRole("navigation", { name: "Roles" })
    .getByRole("link", { name: ROLE })
    .click();

  await page.getByRole("button", { name: "Delete role" }).click();
  await page
    .getByRole("alertdialog", { name: `Delete the ${ROLE} role?` })
    .getByRole("button", { name: "Delete role" })
    .click();

  await expect(page).toHaveURL(/\/admin\/roles$/);
  await expect(page.getByRole("link", { name: ROLE })).toBeHidden();
  await page.goto("/admin/users");
  await expect(row(page, subject)).toContainText("Roles: reader");
});

// The attack: someone without the permission types the address.
test("the admin pages don't exist for an author", async ({ page }) => {
  await open(page, who.author, "/");

  await expect(header(page).getByRole("link", { name: "Admin" })).toBeHidden();
  for (const path of ["/admin/users", "/admin/roles", "/admin/roles/new"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: NOT_FOUND })).toBeVisible();
  }
});
