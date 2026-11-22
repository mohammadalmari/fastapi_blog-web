import { expect, test } from "@playwright/test";

import { mockReading, post } from "./mocks.ts";

const titles = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `Post number ${from + i}`);

test("the feed shows a page of posts and loads the next on request", async ({
  page,
}) => {
  const cursors: Array<string | null> = [];
  await mockReading(page, (query) => {
    cursors.push(query.get("cursor"));
    return query.get("cursor") === "after-10"
      ? { items: [11, 12].map((n) => post(n)), next_cursor: null }
      : {
          items: Array.from({ length: 10 }, (_, i) => post(i + 1)),
          next_cursor: "after-10",
        };
  });

  await page.goto("/");

  const headings = page.getByRole("article").getByRole("heading");
  await expect(headings).toHaveText(titles(1, 10));

  await page.getByRole("button", { name: "Load more posts" }).click();

  // The first ten stay where they were; the next two are added below.
  await expect(headings).toHaveText(titles(1, 12));
  await expect(page.getByRole("button", { name: /Load/ })).toBeHidden();
  expect(cursors).toEqual([null, "after-10"]);
});

test("choosing a tag filters the feed and puts the choice in the address", async ({
  page,
}) => {
  await mockReading(page, (query) => ({
    items:
      query.get("tag") === "security"
        ? [post(7, { title: "Only the secure one", tags: ["security"] })]
        : [post(1), post(7, { tags: ["security"] })],
    next_cursor: null,
  }));

  await page.goto("/");
  await page
    .getByRole("main")
    .getByRole("link", { name: "security" })
    .first()
    .click();

  await expect(page).toHaveURL(/\/\?tag=security$/);
  await expect(
    page.getByRole("heading", { name: "Posts tagged security" })
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Only the secure one" })
  ).toBeVisible();

  // The address alone brings the same list back.
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(1);

  await page.getByRole("link", { name: "All posts" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("article")).toHaveCount(2);
});

test("a filter that matches nothing says so and offers every post", async ({
  page,
}) => {
  await mockReading(page);

  await page.goto("/?author=nobody");

  await expect(
    page.getByRole("heading", { name: "Posts by nobody" })
  ).toBeVisible();
  await expect(page.getByText("No published post matches that.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Show all posts" })
  ).toBeVisible();
});

test("a post opens from the feed and renders its Markdown, but not its HTML", async ({
  page,
}) => {
  await mockReading(page, () => ({ items: [post(1)], next_cursor: null }));
  await page.route("**/api/v1/posts/post-1-a1b2c3", (route) =>
    route.fulfill({
      json: post(1, {
        updated_at: "2026-11-20T12:00:00Z",
        content: [
          "An opening line.",
          "",
          "## A section",
          "",
          "```python",
          "print('hello')",
          "```",
          "",
          '<img src="x" onerror="document.title = \'pwned\'">',
          "",
          "[a trap](javascript:document.title='pwned')",
        ].join("\n"),
      }),
    })
  );

  await page.goto("/");
  await page.getByRole("link", { name: "Post number 1" }).click();

  await expect(page).toHaveURL(/\/posts\/post-1-a1b2c3$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Post number 1" })
  ).toBeVisible();
  await expect(page.getByText("An opening line.")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "A section" })
  ).toBeVisible();
  await expect(page.locator("pre code.language-python")).toContainText("print");
  await expect(page.getByText("Edited 20 Nov 2026")).toBeVisible();

  // The attack: neither the tag nor the link may run anything.
  await expect(page.locator("article img")).toHaveCount(0);
  await page.getByText("a trap").click();
  await expect(page).toHaveTitle("Post number 1, Draftwork Blog");
});

test("a post that doesn't exist, or may not be seen, is 'not found'", async ({
  page,
}) => {
  await mockReading(page);
  await page.route("**/api/v1/posts/secret-draft-x9y8z7", (route) =>
    route.fulfill({ status: 404, json: { detail: "Post not found" } })
  );

  await page.goto("/posts/secret-draft-x9y8z7");

  await expect(
    page.getByRole("heading", { name: "Nothing is written here" })
  ).toBeVisible();
});

test("a profile shows the person and their posts; a missing one is 'not found'", async ({
  page,
}) => {
  const authors: Array<string | null> = [];
  await mockReading(page, (query) => {
    authors.push(query.get("author"));
    return { items: [post(3)], next_cursor: null };
  });
  await page.route("**/api/v1/users/sami", (route) =>
    route.fulfill({
      json: {
        id: "665f1c2e8a4b3d0012345601",
        username: "sami",
        display_name: "Sami H.",
        bio: "Writes about tokens.\nAnd cookies.",
        created_at: "2026-10-01T12:00:00Z",
        avatar_url: null,
      },
    })
  );
  await page.route("**/api/v1/users/ghost", (route) =>
    route.fulfill({ status: 404, json: { detail: "User not found" } })
  );

  await page.goto("/users/sami");

  await expect(
    page.getByRole("heading", { level: 1, name: "Sami H." })
  ).toBeVisible();
  await expect(page.getByText("Writes about tokens.")).toBeVisible();
  await expect(page.getByText("1 Oct 2026")).toBeVisible();
  await expect(page.getByRole("link", { name: "Post number 3" })).toBeVisible();
  expect(authors).toContain("sami");

  await page.goto("/users/ghost");

  await expect(
    page.getByRole("heading", { name: "Nothing is written here" })
  ).toBeVisible();
});

test("the pages for writing send a visitor to log in", async ({ page }) => {
  await mockReading(page);

  await page.goto("/write");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fwrite$/);

  await page.goto("/me/posts");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fme%2Fposts$/);

  await page.goto("/posts/post-1-a1b2c3/edit");
  await expect(page).toHaveURL(/\/login\?redirect=/);
});

test("a visitor who likes a post is sent to log in, to come back to it", async ({
  page,
}) => {
  await mockReading(page);
  await page.route("**/api/v1/posts/post-1-a1b2c3", (route) =>
    route.fulfill({ json: post(1, { content: "Text.", like_count: 3 }) })
  );
  let sent = false;
  await page.route("**/api/v1/posts/*/like", (route) => {
    sent = true;
    return route.fulfill({
      status: 401,
      json: { detail: "Not authenticated" },
    });
  });

  await page.goto("/posts/post-1-a1b2c3");
  await page.getByRole("button", { name: "Like, 3" }).click();

  await expect(page).toHaveURL(/\/login\?redirect=%2Fposts%2Fpost-1-a1b2c3$/);
  expect(sent).toBe(false);
});
