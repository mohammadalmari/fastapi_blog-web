import { describe, expect, it } from "vitest";

import { feedOptions, feedSearchSchema } from "./queries";

describe("feedSearchSchema", () => {
  it("keeps a tag and an author", () => {
    expect(feedSearchSchema.parse({ tag: "c++", author: "sami" })).toEqual({
      tag: "c++",
      author: "sami",
    });
  });

  it("means 'no filter' when nothing is given", () => {
    expect(feedSearchSchema.parse({})).toEqual({});
  });

  it("trims what was typed", () => {
    expect(feedSearchSchema.parse({ tag: "  python " })).toEqual({
      tag: "python",
    });
  });

  // Each would be a 422 from the API. The list is shown unfiltered instead
  // of an error page for an address someone mistyped or made up.
  it.each([
    ["an empty value", ""],
    ["only spaces", "   "],
    ["a value over the API's limit", "x".repeat(31)],
    ["a number", 42],
    ["a list", ["a", "b"]],
  ])("drops %s", (_name, value) => {
    expect(feedSearchSchema.parse({ tag: value, author: value })).toEqual({});
  });

  it("ignores parameters the feed doesn't have", () => {
    expect(feedSearchSchema.parse({ page: 3, tag: "python" })).toEqual({
      tag: "python",
    });
  });
});

describe("feedOptions", () => {
  it("keeps differently filtered lists apart in the cache", () => {
    const all = JSON.stringify(feedOptions().queryKey);
    const python = JSON.stringify(feedOptions({ tag: "python" }).queryKey);
    const sami = JSON.stringify(feedOptions({ author: "sami" }).queryKey);

    expect(new Set([all, python, sami]).size).toBe(3);
  });

  it("follows the API's cursor, and stops when there is none", () => {
    const { getNextPageParam } = feedOptions();
    const page = (next_cursor: string | null) => ({ items: [], next_cursor });

    expect(getNextPageParam(page("abc"), [], null, [])).toBe("abc");
    expect(getNextPageParam(page(null), [], null, [])).toBeNull();
  });
});
