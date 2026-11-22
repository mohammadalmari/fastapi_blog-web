import { describe, expect, it } from "vitest";

import { withLike } from "./like";

describe("withLike", () => {
  it("adds the reader's like and counts it", () => {
    const post = { like_count: 3, liked_by_me: false, title: "kept" };

    expect(withLike(post, true)).toEqual({
      like_count: 4,
      liked_by_me: true,
      title: "kept",
    });
  });

  it("takes it back and uncounts it", () => {
    expect(withLike({ like_count: 4, liked_by_me: true }, false)).toEqual({
      like_count: 3,
      liked_by_me: false,
    });
  });

  // PUT and DELETE state the result, so repeating one changes nothing.
  it.each([true, false])("changes nothing when already %s", (liked) => {
    const thing = { like_count: 2, liked_by_me: liked };

    expect(withLike(thing, liked)).toBe(thing);
  });

  it("never counts below zero, however stale the count", () => {
    expect(
      withLike({ like_count: 0, liked_by_me: true }, false).like_count
    ).toBe(0);
  });

  it("leaves the original alone", () => {
    const thing = { like_count: 1, liked_by_me: false };

    withLike(thing, true);

    expect(thing).toEqual({ like_count: 1, liked_by_me: false });
  });
});
