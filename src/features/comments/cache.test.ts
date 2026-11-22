import { describe, expect, it } from "vitest";

import type { CommentPublic } from "@/api/generated/types.gen";

import type { CommentPages } from "./cache";
import {
  appendComment,
  asPlaceholder,
  flattenComments,
  patchComment,
  removeComment,
} from "./cache";

const comment = (id: string, changes: Partial<CommentPublic> = {}) =>
  ({
    id,
    post_id: "p",
    parent_id: null,
    content: `Comment ${id}`,
    author: { id: "u", username: "sami", display_name: null, avatar_url: null },
    is_deleted: false,
    reply_count: 0,
    like_count: 0,
    liked_by_me: false,
    created_at: "2026-11-18T12:00:00Z",
    updated_at: "2026-11-18T12:00:00Z",
    ...changes,
  }) satisfies CommentPublic;

const pages = (...lists: CommentPublic[][]): CommentPages => ({
  pages: lists.map((items, index) => ({
    items,
    next_cursor: index < lists.length - 1 ? `after-${index}` : null,
  })),
  pageParams: lists.map((_, index) =>
    index === 0 ? null : `after-${index - 1}`
  ),
});

const ids = (data: CommentPages | undefined) =>
  flattenComments(data).map((found) => found.id);

describe("flattenComments", () => {
  it("lists every page's comments in order", () => {
    const data = pages([comment("a"), comment("b")], [comment("c")]);

    expect(ids(data)).toEqual(["a", "b", "c"]);
  });

  it("is empty before anything is fetched", () => {
    expect(flattenComments(undefined)).toEqual([]);
  });

  // A comment added to the end of what was fetched comes again, in its
  // true place, when the older pages before it are fetched.
  it("keeps the later copy of a comment that appears twice", () => {
    const data = pages(
      [comment("a"), comment("new", { content: "added early" })],
      [comment("b"), comment("new", { content: "in its place" })]
    );

    expect(ids(data)).toEqual(["a", "b", "new"]);
    expect(flattenComments(data)[2].content).toBe("in its place");
  });
});

describe("appendComment", () => {
  it("adds after the last comment fetched", () => {
    const data = pages([comment("a")], [comment("b")]);

    expect(ids(appendComment(data, comment("c")))).toEqual(["a", "b", "c"]);
  });

  it("leaves the cursors alone, so the next page still starts where it should", () => {
    const data = pages([comment("a")]);
    data.pages[0].next_cursor = "after-a";

    const added = appendComment(data, comment("z"))!;

    expect(added.pages[0].next_cursor).toBe("after-a");
    expect(added.pageParams).toEqual(data.pageParams);
  });

  it("changes nothing when nothing was fetched: the fetch will bring it", () => {
    expect(appendComment(undefined, comment("a"))).toBeUndefined();
  });

  it("doesn't change what it was given", () => {
    const data = pages([comment("a")]);

    appendComment(data, comment("b"));

    expect(ids(data)).toEqual(["a"]);
  });
});

describe("patchComment", () => {
  it("changes the one comment, on whichever page it is", () => {
    const data = pages([comment("a")], [comment("b")]);

    const patched = patchComment(data, "b", (found) => ({
      ...found,
      like_count: 5,
    }));

    expect(flattenComments(patched).map((found) => found.like_count)).toEqual([
      0, 5,
    ]);
  });

  it("changes nothing for an id that isn't there", () => {
    const data = pages([comment("a")]);

    expect(patchComment(data, "zzz", asPlaceholder)).toEqual(data);
  });
});

describe("removeComment", () => {
  it("takes the comment out and keeps the rest in order", () => {
    const data = pages([comment("a"), comment("b")], [comment("c")]);

    expect(ids(removeComment(data, "b"))).toEqual(["a", "c"]);
  });
});

describe("asPlaceholder", () => {
  it("erases the text, the author and the likes, and keeps the replies' count", () => {
    const deleted = asPlaceholder(
      comment("a", { reply_count: 2, like_count: 7, liked_by_me: true })
    );

    expect(deleted).toMatchObject({
      is_deleted: true,
      content: null,
      author: null,
      like_count: 0,
      liked_by_me: false,
      reply_count: 2,
    });
  });
});
