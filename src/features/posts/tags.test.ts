import { describe, expect, it } from "vitest";

import { normalizeTag, tagProblem } from "./tags";

describe("normalizeTag", () => {
  it.each([
    ["Python", "python"],
    ["  Mongo DB  ", "mongo-db"],
    ["web   dev", "web-dev"],
    ["C++", "c++"],
    ["Node.js", "node.js"],
    // A full-width "Ｐ" looks like "P" and is stored as it.
    ["Ｐython", "python"],
    ["عربي", "عربي"],
    ["   ", ""],
  ])("%j -> %j", (typed, stored) => {
    expect(normalizeTag(typed)).toBe(stored);
  });
});

describe("tagProblem", () => {
  it.each(["python", "c++", "c#", ".net", "node.js", "web_dev", "مقال", "3d"])(
    "accepts %s",
    (tag) => {
      expect(tagProblem(tag)).toBeNull();
    }
  );

  it.each([
    ["nothing", "", /1 to 30 characters/],
    ["31 characters", "x".repeat(31), /1 to 30 characters/],
    ["a slash", "a/b", /may contain/],
    ["a space", "a b", /may contain/],
    ["markup", "<b>", /may contain/],
    // "py" + zero-width joiner + "thon" would pose as "python".
    ["an invisible character", "py‍thon", /may contain/],
    ["only signs", "+-.", /at least one letter or digit/],
    ["a leading accent", "́a", /can't start with an accent/],
  ])("refuses %s", (_name, tag, reason) => {
    expect(tagProblem(tag)).toMatch(reason);
  });

  it("counts characters, not bytes: thirty of any script fit", () => {
    expect(tagProblem("ع".repeat(30))).toBeNull();
    expect(tagProblem("𝒳".repeat(30))).toBeNull();
  });
});
