import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

import type { Account } from "./accounts.ts";
import { createAccount, logIn, tokenFor } from "./accounts.ts";
import { promoteToAdmin } from "./environment.ts";

// Twelve published posts, so the feed (ten at a time) has a second page,
// and one draft that no visitor may see.
const PUBLISHED = 12;

type Made = { slug: string; title: string };

let author: Account;
const published: Made[] = [];
let draft: Made;

async function write(
  request: APIRequestContext,
  token: string,
  data: { title: string; content: string; tags?: string[] },
  publish: boolean
): Promise<Made> {
  const headers = { Authorization: `Bearer ${token}` };
  const created = await request.post("/api/v1/posts", { headers, data });
  expect(created.status(), await created.text()).toBe(201);
  const post = await created.json();
  if (publish) {
    const done = await request.post(`/api/v1/posts/${post.id}/publish`, {
      headers,
    });
    expect(done.status(), await done.text()).toBe(200);
  }
  return { slug: post.slug, title: post.title };
}

test.beforeAll(async ({ playwright, baseURL }) => {
  const request = await playwright.request.newContext({ baseURL });
  // A new account may only read. Writing takes a role, and only the seed
  // command hands out the first one.
  author = await createAccount(request);
  promoteToAdmin(author.email);
  const token = await tokenFor(request, author);

  for (let number = 1; number <= PUBLISHED; number += 1) {
    published.push(
      await write(
        request,
        token,
        {
          title: `Reading test ${number}`,
          content:
            number === PUBLISHED
              ? "The newest post.\n\n## With a section\n\n```python\nprint('hi')\n```\n\n<script>document.title = 'pwned'</script>"
              : `Body of post ${number}.`,
          tags: number % 2 === 0 ? ["even", "reading"] : ["reading"],
        },
        true
      )
    );
  }
  // An Arabic title: the slug keeps letters of any script.
  published.push(
    await write(
      request,
      token,
      { title: "ملاحظات القراءة", content: "نص عربي.", tags: ["عربي"] },
      true
    )
  );
  draft = await write(
    request,
    token,
    { title: "Unfinished thoughts", content: "Not ready." },
    false
  );
  await request.dispose();
});

test("a visitor reads the feed newest first, page by page, without the draft", async ({
  page,
}) => {
  await page.goto("/");

  const headings = page.getByRole("article").getByRole("heading");
  await expect(headings).toHaveCount(10);
  // Newest first: the Arabic post was published last.
  await expect(headings.first()).toHaveText("ملاحظات القراءة");
  await expect(headings.nth(1)).toHaveText("Reading test 12");

  await page.getByRole("button", { name: "Load more posts" }).click();

  await expect(headings).toHaveCount(PUBLISHED + 1);
  await expect(headings.last()).toHaveText("Reading test 1");
  await expect(page.getByRole("button", { name: /Load/ })).toBeHidden();
  await expect(page.getByText(draft.title)).toBeHidden();
});

test("a tag from the tag row narrows the feed to the posts that carry it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^even\s*6$/ }).click();

  await expect(page).toHaveURL(/\?tag=even$/);
  const headings = page.getByRole("article").getByRole("heading");
  await expect(headings).toHaveCount(6);
  await expect(headings.first()).toHaveText("Reading test 12");
});

test("a tag in another script works as a filter", async ({ page }) => {
  await page.goto("/tags");
  await page.getByRole("link", { name: "عربي" }).click();

  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "ملاحظات القراءة" })
  ).toBeVisible();
});

test("a post opens with its Markdown rendered, and leads to its author's profile", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Reading test 12" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Reading test 12" })
  ).toBeVisible();
  await expect(page.getByText("The newest post.")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "With a section" })
  ).toBeVisible();
  await expect(page.locator("pre code.language-python")).toContainText("print");
  // The script the author typed ran nowhere.
  await expect(page).toHaveTitle("Reading test 12, Draftwork Blog");

  await page
    .getByRole("article")
    .getByRole("link", { name: author.username })
    .click();

  await expect(page).toHaveURL(new RegExp(`/users/${author.username}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: author.username })
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(10);
});

test("someone else's draft is 'not found' to a visitor, and a post to its author", async ({
  page,
}) => {
  await page.goto(`/posts/${draft.slug}`);

  await expect(
    page.getByRole("heading", { name: "Nothing is written here" })
  ).toBeVisible();
  await expect(page.getByText(draft.title)).toBeHidden();

  await page.goto(`/login?redirect=/posts/${draft.slug}`);
  await logIn(page, author);

  await expect(
    page.getByRole("heading", { level: 1, name: draft.title })
  ).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
});

test("a profile that doesn't exist is 'not found'", async ({ page }) => {
  await page.goto("/users/nobody_by_this_name");

  await expect(
    page.getByRole("heading", { name: "Nothing is written here" })
  ).toBeVisible();
});
