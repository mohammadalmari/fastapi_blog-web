import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import type { CreatedAccount } from "./accounts.ts";
import {
  accountLink,
  createAccount,
  header,
  logIn,
  logInLink,
} from "./accounts.ts";

// These tests change an account's name and password, so they get one of
// their own: the shared accounts must stay as the other specs expect them.
// Run in order, each leaving the account as the next finds it.
test.describe.configure({ mode: "serial" });

let account: CreatedAccount;
const NEW_PASSWORD = "Qu1et-harbor-lantern";

test.beforeAll(async ({ playwright, baseURL }) => {
  const request = await playwright.request.newContext({ baseURL });
  account = await createAccount(request);
  await request.dispose();
});

async function open(page: Page, path: string) {
  await page.goto(`/login?redirect=${path}`);
  await logIn(page, account);
  // Until the address changes the login form is still on the page, and its
  // "Email or username" box would answer to "Username".
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

// The smallest valid PNG: one transparent pixel.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

test("a name and a bio are saved and shown on the public profile", async ({
  page,
}) => {
  await open(page, "/settings/profile");

  await page.getByLabel("Name", { exact: true }).fill("Noor of the North");
  await page.getByLabel("About you").fill("Writes at night.\nReads by day.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  await page.getByRole("link", { name: "your profile page" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Noor of the North" })
  ).toBeVisible();
  await expect(page.getByText("Writes at night.")).toBeVisible();

  // Emptying the name goes back to the username.
  await page.goto("/settings/profile");
  await page.getByLabel("Name", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await page.goto(`/users/${account.username}`);
  await expect(
    page.getByRole("heading", { level: 1, name: account.username })
  ).toBeVisible();
});

test("a new username moves the profile, and a taken one is refused", async ({
  page,
}) => {
  const old = account.username;
  const renamed = `${old}_x`;
  await open(page, "/settings/profile");

  await page.getByLabel("Username", { exact: true }).fill("Not Allowed!");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByText("Use 3 to 30 letters, digits or underscores.")
  ).toBeVisible();

  // Typed in capitals, stored in lowercase.
  await page
    .getByLabel("Username", { exact: true })
    .fill(renamed.toUpperCase());
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  account = { ...account, username: renamed };
  await expect(accountLink(page, account)).toBeVisible();

  await page.goto(`/users/${renamed}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
  await page.goto(`/users/${old}`);
  await expect(
    page.getByRole("heading", { name: "Nothing is written here" })
  ).toBeVisible();
});

test("a picture is uploaded, shown, and removed; a file that isn't one is refused unsent", async ({
  page,
}) => {
  await open(page, "/settings/profile");
  const picker = page.getByLabel("Choose a picture");
  let uploads = 0;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/users/me/avatar") &&
      request.method() === "PUT"
    )
      uploads += 1;
  });

  await picker.setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a picture"),
  });
  await expect(page.getByRole("alert")).toHaveText(
    "Choose a PNG, JPEG or WebP picture."
  );
  expect(uploads).toBe(0);

  // A PNG by name and type, but not inside: only the API can tell.
  await picker.setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a picture either"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("main img")).toHaveCount(0);

  await picker.setInputFiles({
    name: "me.png",
    mimeType: "image/png",
    buffer: PIXEL,
  });
  const picture = page.locator("main img");
  await expect(picture).toHaveAttribute("src", /^\/media\/avatars\/.+\.webp$/);
  // The API serves it: the picture really loads.
  await expect
    .poll(() =>
      picture.evaluate(
        (img) => (img as unknown as { naturalWidth: number }).naturalWidth
      )
    )
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: "Remove picture" }).click();
  await expect(picture).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add a picture" })
  ).toBeVisible();
});

test("logging out everywhere ends the session in another browser", async ({
  page,
  browser,
  baseURL,
}) => {
  const elsewhere = await browser.newContext({ baseURL });
  const otherPage = await elsewhere.newPage();
  await open(otherPage, "/");
  await expect(accountLink(otherPage, account)).toBeVisible();

  await open(page, "/settings/security");
  await page.getByRole("button", { name: "Log out everywhere" }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("You are logged out everywhere.")).toBeVisible();

  // The other browser finds out when it next has to prove who it is.
  await otherPage.reload();
  await expect(logInLink(otherPage)).toBeVisible();
  await elsewhere.close();
});

test("changing the password logs out, says why, and only the new one works", async ({
  page,
}) => {
  await open(page, "/settings/security");

  // The wrong current password: refused under that field, nothing changed.
  await page.getByLabel("Current password").fill("not-my-password");
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("New password, again").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Incorrect password")).toBeVisible();
  await expect(page.getByLabel("Current password")).toHaveAttribute(
    "aria-invalid",
    "true"
  );

  await page.getByLabel("Current password").fill(account.password);
  await page.getByLabel("New password, again").fill("something-else");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("The two don't match.")).toBeVisible();

  await page.getByLabel("New password, again").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Your password is changed.")).toBeVisible();
  await expect(logInLink(page)).toBeVisible();

  // The old password no longer opens the account.
  await logIn(page, account);
  await expect(page.getByRole("alert").last()).toHaveText(
    "Incorrect email, username or password"
  );

  account = { ...account, password: NEW_PASSWORD };
  await logIn(page, account);
  // Back where the change was made.
  await expect(page).toHaveURL(/\/settings\/security$/);
  await expect(
    header(page).getByRole("button", { name: "Log out" })
  ).toBeVisible();
});
