import type { Browser } from "@playwright/test";
import { expect, test } from "@playwright/test";

import type { CreatedAccount } from "./accounts.ts";
import { header, logIn, tokenFor } from "./accounts.ts";
import { people } from "./people.ts";

// An author, with exactly the "author" role: their own posts and nothing
// else. And an administrator's post, which the author may read but not edit.
let author: CreatedAccount;
let someoneElses: { slug: string; title: string };

test.beforeAll(async ({ playwright, baseURL }) => {
  const request = await playwright.request.newContext({ baseURL });
  const { admin } = people();
  author = people().author;
  const adminToken = await tokenFor(request, admin);

  const headers = { Authorization: `Bearer ${adminToken}` };
  const created = await request.post("/api/v1/posts", {
    headers,
    data: { title: "The administrator's post", content: "Not the author's." },
  });
  expect(created.status(), await created.text()).toBe(201);
  const post = await created.json();
  await request.post(`/api/v1/posts/${post.id}/publish`, { headers });
  someoneElses = { slug: post.slug, title: post.title };
  await request.dispose();
});

/** A second browser with no login: what everyone else sees. */
async function asVisitor(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({ baseURL });
  return { context, page: await context.newPage() };
}

const NOT_FOUND = "Nothing is written here";

test("a post goes from draft to published, is edited, unpublished and deleted", async ({
  page,
  browser,
  baseURL,
}) => {
  const title = `From draft to gone ${Date.now().toString(36)}`;
  const visitor = await asVisitor(browser, baseURL);

  await page.goto("/login");
  await logIn(page, author);
  await header(page).getByRole("link", { name: "Write" }).click();

  // Written, with a tag typed loosely and shown as it will be stored.
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Tags").fill("Web Dev");
  await page.getByLabel("Tags").press("Enter");
  await expect(page.getByText("web-dev")).toBeVisible();
  await page
    .getByLabel("Post, in Markdown")
    .fill("An opening line.\n\n## A heading");
  await expect(
    page
      .getByRole("region", { name: "Preview" })
      .getByRole("heading", { name: "A heading" })
  ).toBeVisible();

  // Saved as a draft: it gets its own address, and nobody else can see it.
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/posts\/[^/]+\/edit$/);
  const slug = new URL(page.url()).pathname.split("/")[2];
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();

  await visitor.page.goto(`/posts/${slug}`);
  await expect(
    visitor.page.getByRole("heading", { name: NOT_FOUND })
  ).toBeVisible();

  // Listed among the author's posts, marked as a draft.
  await header(page).getByRole("link", { name: "My posts" }).click();
  const listed = page.getByRole("article").filter({ hasText: title });
  await expect(listed.getByText("Draft", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Published", exact: true }).click();
  await expect(page.getByText("Nothing published yet.")).toBeVisible();
  await page.getByRole("link", { name: "Drafts" }).click();
  await listed.getByRole("link", { name: "Edit" }).click();

  // An unsaved change is not lost to a stray click.
  await page.getByLabel("Title").fill(`${title}, revised`);
  await header(page).getByRole("link", { name: "Posts", exact: true }).click();
  await expect(
    page.getByRole("alertdialog", { name: "Leave without saving?" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep writing" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(page.getByLabel("Title")).toHaveValue(`${title}, revised`);

  // Published, with the change: public at the same address.
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/posts/${slug}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: `${title}, revised` })
  ).toBeVisible();

  await visitor.page.reload();
  await expect(
    visitor.page.getByRole("heading", { level: 1, name: `${title}, revised` })
  ).toBeVisible();
  await visitor.page.goto("/?tag=web-dev");
  await expect(
    visitor.page.getByRole("link", { name: `${title}, revised` })
  ).toBeVisible();

  // Edited while public.
  await page.getByRole("link", { name: "Edit post" }).click();
  await page
    .getByLabel("Post, in Markdown")
    .fill("A better opening line.\n\n## A heading");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Saved at");
  await visitor.page.goto(`/posts/${slug}`);
  await expect(visitor.page.getByText("A better opening line.")).toBeVisible();

  // Unpublished: a draft again, and gone for everyone else.
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await visitor.page.reload();
  await expect(
    visitor.page.getByRole("heading", { name: NOT_FOUND })
  ).toBeVisible();

  // Deleted, after being asked once.
  await page.getByRole("button", { name: "Delete post" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete this post?" });
  await dialog.getByRole("button", { name: "Keep post" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Delete post" }).click();
  await dialog.getByRole("button", { name: "Delete post" }).click();

  await expect(page).toHaveURL(/\/me\/posts$/);
  await expect(page.getByText(title)).toBeHidden();
  await page.goto(`/posts/${slug}`);
  await expect(page.getByRole("heading", { name: NOT_FOUND })).toBeVisible();

  await visitor.context.close();
});

test("publishing straight from a new post makes it public at once", async ({
  page,
}) => {
  const title = `Straight to public ${Date.now().toString(36)}`;
  await page.goto("/login?redirect=/write");
  await logIn(page, author);

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Post, in Markdown").fill("Short and done.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: title })
  ).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeHidden();
  // The summary was written by the API, from the post.
  await page.goto("/me/posts");
  await expect(
    page.getByRole("article").filter({ hasText: title })
  ).toContainText("Short and done.");
});

test("a post with nothing in it is refused before it is sent", async ({
  page,
}) => {
  await page.goto("/login?redirect=/write");
  await logIn(page, author);
  await expect(page.getByLabel("Title")).toBeVisible();

  await page.getByRole("button", { name: "Save draft" }).click();

  await expect(page.getByText("Give the post a title.")).toBeVisible();
  await expect(page.getByText("Write something first.")).toBeVisible();
  await expect(page).toHaveURL(/\/write$/);
});

// The attack: an author opens the editor's address for a post that isn't
// theirs. The API would refuse the save; the page shouldn't exist at all.
test("someone else's post offers no way to edit it", async ({ page }) => {
  await page.goto(`/login?redirect=/posts/${someoneElses.slug}`);
  await logIn(page, author);

  await expect(
    page.getByRole("heading", { level: 1, name: someoneElses.title })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit post" })).toBeHidden();

  await page.goto(`/posts/${someoneElses.slug}/edit`);

  await expect(page.getByRole("heading", { name: NOT_FOUND })).toBeVisible();
});
