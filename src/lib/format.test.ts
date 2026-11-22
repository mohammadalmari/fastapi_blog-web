import { describe, expect, it } from "vitest";

import { count, formatDate } from "./format";

describe("count", () => {
  it.each([
    [0, "0 likes"],
    [1, "1 like"],
    [2, "2 likes"],
    [1200, "1200 likes"],
  ])("%i -> %s", (amount, expected) => {
    expect(count(amount, "like")).toBe(expected);
  });
});

describe("count, for a word with its own plural", () => {
  it.each([
    [1, "1 reply"],
    [2, "2 replies"],
  ])("%i -> %s", (amount, expected) => {
    expect(count(amount, "reply")).toBe(expected);
  });
});

describe("formatDate", () => {
  it("writes the day, a short month and the year", () => {
    // Noon, so the reader's time zone can't move it to another day.
    expect(formatDate("2026-11-18T12:00:00Z")).toBe("18 Nov 2026");
  });
});
