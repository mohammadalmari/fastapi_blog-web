import { describe, expect, it } from "vitest";

import { can, canOn } from "./permissions";

const author = {
  id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  permissions: ["posts:create", "posts:update:own"],
};
const editor = {
  id: "bbbbbbbbbbbbbbbbbbbbbbbb",
  permissions: ["posts:update:any"],
};
const POST_UPDATE = {
  any: "posts:update:any",
  own: "posts:update:own",
} as const;

describe("can", () => {
  it("is true for a permission the person holds", () => {
    expect(can(author, "posts:create")).toBe(true);
  });

  it("is false for one they don't", () => {
    expect(can(author, "roles:create")).toBe(false);
  });

  it.each([null, undefined])("is false for a visitor (%s)", (visitor) => {
    expect(can(visitor, "posts:create")).toBe(false);
  });
});

describe("canOn", () => {
  it("allows your own with the 'own' permission", () => {
    expect(canOn(author, author.id, POST_UPDATE)).toBe(true);
  });

  it("refuses someone else's with only the 'own' permission", () => {
    expect(canOn(author, editor.id, POST_UPDATE)).toBe(false);
  });

  it("allows anyone's with the 'any' permission", () => {
    expect(canOn(editor, author.id, POST_UPDATE)).toBe(true);
  });

  it("refuses when the thing has no owner and only 'own' is held", () => {
    expect(canOn(author, null, POST_UPDATE)).toBe(false);
  });

  it("needs 'any' when no 'own' permission exists for the action", () => {
    expect(canOn(author, author.id, { any: "comments:delete:any" })).toBe(
      false
    );
  });

  it("refuses a visitor", () => {
    expect(canOn(null, author.id, POST_UPDATE)).toBe(false);
  });
});
