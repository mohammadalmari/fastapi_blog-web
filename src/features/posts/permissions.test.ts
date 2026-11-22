import { describe, expect, it } from "vitest";

import { canDeletePost, canEditPost, canPublishPost } from "./permissions";

const AUTHOR_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const person = (id: string, ...permissions: string[]) => ({ id, permissions });

const writer = {
  id: AUTHOR_ID,
  username: "w",
  display_name: null,
  avatar_url: null,
};
const draft = { status: "draft" as const, author: writer };
const published = { status: "published" as const, author: writer };

// The roles the API's seed command creates.
const author = person(
  AUTHOR_ID,
  "posts:create",
  "posts:update:own",
  "posts:delete:own",
  "posts:publish:own"
);
const editor = person(
  "bbbbbbbbbbbbbbbbbbbbbbbb",
  "posts:update:any",
  "posts:publish:any",
  "posts:delete:any"
);
const reader = person("cccccccccccccccccccccccc", "comments:create");

describe("canEditPost", () => {
  it("lets an author edit their own draft and their own published post", () => {
    expect(canEditPost(author, draft)).toBe(true);
    expect(canEditPost(author, published)).toBe(true);
  });

  it("lets an editor edit anyone's", () => {
    expect(canEditPost(editor, draft)).toBe(true);
    expect(canEditPost(editor, published)).toBe(true);
  });

  it("refuses a reader, and a visitor", () => {
    expect(canEditPost(reader, published)).toBe(false);
    expect(canEditPost(null, published)).toBe(false);
  });

  it("refuses another author's post", () => {
    const other = { ...author, id: "dddddddddddddddddddddddd" };

    expect(canEditPost(other, draft)).toBe(false);
  });

  // Editing what is already public is publishing the new text.
  it("refuses a published post to someone who may update but not publish", () => {
    const draftsOnly = person(AUTHOR_ID, "posts:update:own");

    expect(canEditPost(draftsOnly, draft)).toBe(true);
    expect(canEditPost(draftsOnly, published)).toBe(false);
  });

  it("needs 'any' for a post whose author is gone", () => {
    const orphan = { status: "draft" as const, author: null };

    expect(canEditPost(author, orphan)).toBe(false);
    expect(canEditPost(editor, orphan)).toBe(true);
  });
});

describe("canPublishPost and canDeletePost", () => {
  it("follow the same own-or-any rule", () => {
    expect(canPublishPost(author, draft)).toBe(true);
    expect(canDeletePost(author, draft)).toBe(true);
    expect(canPublishPost(editor, draft)).toBe(true);
    expect(canDeletePost(editor, draft)).toBe(true);
    expect(canPublishPost(reader, draft)).toBe(false);
    expect(canDeletePost(reader, draft)).toBe(false);
  });
});
