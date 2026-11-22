import { describe, expect, it } from "vitest";

import { safeRedirect } from "./redirect";

describe("safeRedirect", () => {
  it.each(["/", "/tags", "/posts/hello-a1b2c3?tab=comments#reply"])(
    "keeps a path on this site: %s",
    (target) => {
      expect(safeRedirect(target)).toBe(target);
    }
  );

  // Each of these, left alone, would send someone who logged in through
  // our page to a site of the link's author's choosing.
  it.each([
    ["another site", "https://evil.example/login"],
    ["a scheme-relative address", "//evil.example"],
    ["a backslash browsers read as a slash", "/\\evil.example"],
    ["a script address", "javascript:alert(1)"],
    ["a tab hiding the second slash", "/\t/evil.example"],
    ["a path that doesn't start at the root", "evil.example"],
    ["nothing", ""],
    ["something that isn't text", { redirect: "/tags" }],
    ["a missing value", undefined],
  ])("sends %s home", (_name, target) => {
    expect(safeRedirect(target)).toBe("/");
  });
});
