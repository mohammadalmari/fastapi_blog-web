import { describe, expect, it } from "vitest";

import type { CommentPublic } from "@/api/generated/types.gen";

import { commentSchema } from "./comment-form";
import { canDeleteComment, canEditComment } from "./permissions";

const refused = (content: string) =>
  !commentSchema.safeParse({ content }).success;

describe("commentSchema", () => {
  it("keeps line breaks and tabs: a comment may span several lines", () => {
    const content = "First line.\n\n\tSecond, indented.";

    expect(commentSchema.parse({ content }).content).toBe(content);
  });

  it("trims the ends", () => {
    expect(commentSchema.parse({ content: "  hi\n" }).content).toBe("hi");
  });

  it.each([
    ["nothing", ""],
    ["only spaces and line breaks", " \n \n"],
    ["over 5,000 characters", "x".repeat(5001)],
    ["a zero-width space", "he​llo"],
    ["a right-to-left override", "a‮b"],
  ])("refuses %s", (_name, content) => {
    expect(refused(content)).toBe(true);
  });

  it("accepts exactly 5,000 characters", () => {
    expect(refused("x".repeat(5000))).toBe(false);
  });
});

const WRITER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const person = (id: string, ...permissions: string[]) => ({ id, permissions });
const comment = (changes: Partial<CommentPublic> = {}) =>
  ({
    is_deleted: false,
    author: { id: WRITER, username: "w", display_name: null, avatar_url: null },
    ...changes,
  }) as CommentPublic;

// The roles the API's seed command creates.
const reader = person(WRITER, "comments:update:own", "comments:delete:own");
const otherReader = { ...reader, id: "bbbbbbbbbbbbbbbbbbbbbbbb" };
const moderator = person("cccccccccccccccccccccccc", "comments:delete:any");

describe("canEditComment", () => {
  it("lets the writer edit their own", () => {
    expect(canEditComment(reader, comment())).toBe(true);
  });

  // No permission lets anyone put words in another's mouth.
  it("refuses everyone else, a moderator included", () => {
    expect(canEditComment(otherReader, comment())).toBe(false);
    expect(canEditComment(moderator, comment())).toBe(false);
    expect(canEditComment(null, comment())).toBe(false);
  });

  it("refuses a deleted comment", () => {
    expect(canEditComment(reader, comment({ is_deleted: true }))).toBe(false);
  });
});

describe("canDeleteComment", () => {
  it("lets the writer and a moderator delete", () => {
    expect(canDeleteComment(reader, comment())).toBe(true);
    expect(canDeleteComment(moderator, comment())).toBe(true);
  });

  it("refuses another reader, and a visitor", () => {
    expect(canDeleteComment(otherReader, comment())).toBe(false);
    expect(canDeleteComment(undefined, comment())).toBe(false);
  });

  it("refuses a placeholder: it is already deleted", () => {
    const placeholder = comment({ is_deleted: true, author: null });

    expect(canDeleteComment(moderator, placeholder)).toBe(false);
  });
});
