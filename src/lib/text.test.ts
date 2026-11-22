import { describe, expect, it } from "vitest";

import { hasHiddenCharacters } from "./text";

describe("hasHiddenCharacters", () => {
  it.each([
    ["plain text", "Hello, world"],
    ["another script", "مرحبا بالعالم"],
    ["an emoji", "Launch 🚀"],
    ["the joiners some scripts need", "می‌خواهم ‍"],
  ])("is false for %s", (_name, text) => {
    expect(hasHiddenCharacters(text)).toBe(false);
  });

  // Each can make text read as something other than what it is.
  it.each([
    ["a NUL", "a\u0000b"],
    ["an escape", "a\u001bb"],
    ["a zero-width space", "a​b"],
    ["a right-to-left override", "a‮b"],
    ["a byte-order mark", "﻿a"],
    ["a line separator", "a b"],
    ["a line break", "a\nb"],
    ["a tab", "a\tb"],
  ])("is true for %s", (_name, text) => {
    expect(hasHiddenCharacters(text)).toBe(true);
  });

  it("lets through what the caller allows, such as line breaks in a comment", () => {
    expect(hasHiddenCharacters("a\nb\tc", "\n\r\t")).toBe(false);
    expect(hasHiddenCharacters("a​b", "\n\r\t")).toBe(true);
  });
});
