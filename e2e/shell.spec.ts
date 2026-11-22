import { expect, test } from "@playwright/test";

// These tests need no API: the one request the pages make is answered here.
// Flows against the real API start with the accounts stage.

const TAGS = "**/api/v1/tags";

test("the header leads from the posts to the tags", async ({ page }) => {
  await page.route(TAGS, (route) =>
    route.fulfill({
      json: [
        { name: "python", count: 14 },
        { name: "security", count: 1 },
      ],
    })
  );

  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByText("Tags")
    .click();

  await expect(page).toHaveURL(/\/tags$/);
  await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveText([
    /python.*14 posts/,
    /security.*1 post$/,
  ]);
  await expect(page).toHaveTitle("Tags, Draftwork Blog");
});

test("an unknown address says nothing is there and offers a way back", async ({
  page,
}) => {
  await page.goto("/no/such/page");

  await expect(
    page.getByRole("heading", { name: "Nothing is written here" })
  ).toBeVisible();

  await page.getByRole("link", { name: "Go to the posts" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("a failed request shows the API's request id, and trying again recovers", async ({
  page,
}) => {
  let fail = true;
  await page.route(TAGS, (route) =>
    fail
      ? route.fulfill({
          status: 500,
          headers: {
            "X-Request-ID": "req-test-123",
            "Access-Control-Expose-Headers": "X-Request-ID",
          },
          json: { detail: "Internal Server Error" },
        })
      : route.fulfill({ json: [{ name: "python", count: 3 }] })
  );

  await page.goto("/tags");

  await expect(
    page.getByRole("heading", { name: "That didn't load" })
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("req-test-123")).toBeVisible();

  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(page.getByRole("listitem")).toHaveText(/python.*3 posts/);
});
