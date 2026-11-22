import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import type { CreatedAccount } from "./accounts.ts";
import { logIn, tokenFor } from "./accounts.ts";
import type { People } from "./people.ts";
import { people } from "./people.ts";

// Three posts by the administrator, one per test, so no test's comments
// or likes are in another's way.
let who: People;
const posts: Record<"talk" | "likes" | "moderation", string> = {
  talk: "",
  likes: "",
  moderation: "",
};

test.beforeAll(async ({ playwright, baseURL }) => {
  who = people();
  const request = await playwright.request.newContext({ baseURL });
  const headers = {
    Authorization: `Bearer ${await tokenFor(request, who.admin)}`,
  };
  for (const name of Object.keys(posts) as Array<keyof typeof posts>) {
    const created = await request.post("/api/v1/posts", {
      headers,
      data: { title: `A post about ${name}`, content: "Something to discuss." },
    });
    expect(created.status(), await created.text()).toBe(201);
    const post = await created.json();
    await request.post(`/api/v1/posts/${post.id}/publish`, { headers });
    posts[name] = post.slug;
  }
  await request.dispose();
});

async function openAs(page: Page, account: CreatedAccount, slug: string) {
  await page.goto(`/login?redirect=/posts/${slug}`);
  await logIn(page, account);
  await expect(page).toHaveURL(new RegExp(`/posts/${slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

const thread = (page: Page) => page.getByRole("region", { name: /comments?$/ });
const comments = (page: Page) =>
  thread(page).getByRole("article", { name: "Comment" });

test("a reader comments, edits, replies and deletes, and the count keeps up", async ({
  page,
}) => {
  await openAs(page, who.reader, posts.talk);
  await expect(
    thread(page).getByRole("heading", { name: "0 comments" })
  ).toBeVisible();

  // A comment, over two lines.
  await page.getByLabel("Add a comment").fill("First line.\nSecond line.");
  await page.getByRole("button", { name: "Post comment" }).click();

  const comment = comments(page).first();
  await expect(comment).toContainText("First line.");
  await expect(comment).toContainText(who.reader.username);
  await expect(
    thread(page).getByRole("heading", { name: "1 comment" })
  ).toBeVisible();
  await expect(page.getByLabel("Add a comment")).toHaveValue("");

  // Edited.
  await comment.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Edit your comment").fill("A better first line.");
  await page.getByRole("button", { name: "Save comment" }).click();
  await expect(comment).toContainText("A better first line.");
  await expect(comment).toContainText("Edited");

  // Replied to: the reply shows under it at once.
  await comment.getByRole("button", { name: "Reply" }).click();
  await page.getByLabel("Your reply").fill("A reply to myself.");
  await page.getByRole("button", { name: "Post reply" }).click();
  const reply = comment.getByRole("article", { name: "Reply" });
  await expect(reply).toContainText("A reply to myself.");
  // One level only: a reply can't be replied to.
  await expect(reply.getByRole("button", { name: "Reply" })).toBeHidden();
  await expect(
    thread(page).getByRole("heading", { name: "2 comments" })
  ).toBeVisible();

  // It is all still there after a reload, the reply a click away.
  await page.reload();
  await expect(comments(page)).toHaveCount(1);
  await comment.getByRole("button", { name: "Show 1 reply" }).click();
  await expect(reply).toContainText("A reply to myself.");

  // Deleting a comment that has a reply leaves a placeholder in its place.
  await comment.getByRole("button", { name: "Delete" }).first().click();
  await page
    .getByRole("alertdialog", { name: "Delete this comment?" })
    .getByRole("button", { name: "Delete comment" })
    .click();
  await expect(comment).toContainText("This comment was deleted.");
  await expect(comment).not.toContainText("A better first line.");
  await expect(reply).toContainText("A reply to myself.");

  // Deleting its last reply takes the placeholder with it.
  await reply.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("alertdialog", { name: "Delete this comment?" })
    .getByRole("button", { name: "Delete comment" })
    .click();
  await expect(comments(page)).toHaveCount(0);
  await expect(
    thread(page).getByRole("heading", { name: "0 comments" })
  ).toBeVisible();
});

test("a like shows at once, survives a reload, and can be taken back", async ({
  page,
}) => {
  await openAs(page, who.reader, posts.likes);
  const liking = page.getByRole("button", { name: /^Liked?, \d+$/ }).first();
  await expect(liking).toHaveText("Like, 0");

  await liking.click();
  await expect(liking).toHaveText("Liked, 1");
  await expect(liking).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(liking).toHaveText("Liked, 1");

  await liking.click();
  await expect(liking).toHaveText("Like, 0");
  await page.reload();
  await expect(liking).toHaveText("Like, 0");

  // A comment is liked the same way.
  await page.getByLabel("Add a comment").fill("Like me.");
  await page.getByRole("button", { name: "Post comment" }).click();
  const commentLike = comments(page)
    .first()
    .getByRole("button", { name: /^Liked?, \d+$/ });
  await commentLike.click();
  await expect(commentLike).toHaveText("Liked, 1");
  await page.reload();
  await expect(commentLike).toHaveText("Liked, 1");
});

test("a visitor who tries to like or comment logs in and comes back", async ({
  page,
}) => {
  await page.goto(`/posts/${posts.likes}`);
  await expect(page.getByLabel("Add a comment")).toBeHidden();

  await page
    .getByRole("button", { name: /^Like, \d+$/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/login\?redirect=/);
  await logIn(page, who.reader);
  await expect(page).toHaveURL(new RegExp(`/posts/${posts.likes}$`));
  await expect(page.getByLabel("Add a comment")).toBeVisible();
});

// A moderator may remove what someone wrote. Nobody may reword it.
test("a moderator can delete someone's comment but not edit it; another reader can do neither", async ({
  page,
  browser,
  baseURL,
}) => {
  await openAs(page, who.reader, posts.moderation);
  await page.getByLabel("Add a comment").fill("The reader's words.");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(comments(page).first()).toContainText("The reader's words.");

  // Another person without the permission: the author of other posts.
  const other = await browser.newContext({ baseURL });
  const otherPage = await other.newPage();
  await openAs(otherPage, who.author, posts.moderation);
  const seenByOther = comments(otherPage).first();
  await expect(seenByOther).toContainText("The reader's words.");
  await expect(seenByOther.getByRole("button", { name: "Edit" })).toBeHidden();
  await expect(
    seenByOther.getByRole("button", { name: "Delete" })
  ).toBeHidden();
  await other.close();

  const moderator = await browser.newContext({ baseURL });
  const moderatorPage = await moderator.newPage();
  await openAs(moderatorPage, who.admin, posts.moderation);
  const seenByModerator = comments(moderatorPage).first();
  await expect(
    seenByModerator.getByRole("button", { name: "Edit" })
  ).toBeHidden();
  await seenByModerator.getByRole("button", { name: "Delete" }).click();
  await moderatorPage
    .getByRole("alertdialog", { name: "Delete this comment?" })
    .getByRole("button", { name: "Delete comment" })
    .click();
  await expect(comments(moderatorPage)).toHaveCount(0);
  await moderator.close();

  await page.reload();
  await expect(comments(page)).toHaveCount(0);
});
