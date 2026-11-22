import { describe, expect, it } from "vitest";

import { postFormSchema, toCreate, toUpdate } from "./post-form";

const valid = {
  title: "Hello",
  content: "Some text.",
  excerpt: "",
  tags: ["python"],
};

const problems = (values: unknown) => {
  const result = postFormSchema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);
};

describe("postFormSchema", () => {
  it("accepts a post with a title and something written", () => {
    expect(problems(valid)).toEqual([]);
  });

  it("trims the title and the summary", () => {
    const parsed = postFormSchema.parse({
      ...valid,
      title: "  Hello  ",
      excerpt: " A summary. ",
    });

    expect(parsed.title).toBe("Hello");
    expect(parsed.excerpt).toBe("A summary.");
  });

  it("leaves the content exactly as written", () => {
    const content = "  indented\n\ntrailing  \n";

    expect(postFormSchema.parse({ ...valid, content }).content).toBe(content);
  });

  it.each([
    ["an empty title", { title: "" }, "title"],
    ["a title of spaces", { title: "   " }, "title"],
    ["a title over 200 characters", { title: "x".repeat(201) }, "title"],
    ["a title with a zero-width space", { title: "Hel​lo" }, "title"],
    ["a title with a right-to-left override", { title: "a‮b" }, "title"],
    ["nothing written", { content: "" }, "content"],
    ["over 100,000 characters", { content: "x".repeat(100_001) }, "content"],
    ["a summary over 300 characters", { excerpt: "x".repeat(301) }, "excerpt"],
    ["a summary with a line break", { excerpt: "a\nb" }, "excerpt"],
    [
      "eleven tags",
      { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) },
      "tags",
    ],
    ["a tag the API would refuse", { tags: ["a/b"] }, "tags"],
  ])("refuses %s", (_name, change, field) => {
    expect(problems({ ...valid, ...change })).toContain(field);
  });

  it("accepts the limits themselves", () => {
    const atLimits = {
      title: "x".repeat(200),
      content: "x".repeat(100_000),
      excerpt: "x".repeat(300),
      tags: Array.from({ length: 10 }, (_, i) => `t${i}`),
    };

    expect(problems(atLimits)).toEqual([]);
  });

  it("allows the joiners some scripts need in a title", () => {
    expect(problems({ ...valid, title: "می‌خواهم" })).toEqual([]);
  });
});

describe("toCreate", () => {
  it("leaves an empty summary out, so the API writes one", () => {
    expect(toCreate(valid).excerpt).toBeNull();
  });

  it("sends a summary that was written", () => {
    expect(toCreate({ ...valid, excerpt: "Mine." }).excerpt).toBe("Mine.");
  });
});

describe("toUpdate", () => {
  it("sends only what changed", () => {
    expect(toUpdate(valid, { title: true })).toEqual({ title: "Hello" });
  });

  it("sends nothing when nothing changed", () => {
    expect(toUpdate(valid, {})).toEqual({});
  });

  // Sending back the summary the API wrote would make it the author's, and
  // it would stop following the post.
  it("doesn't send a summary the author didn't touch", () => {
    const loaded = { ...valid, excerpt: "Written by the API." };

    expect(toUpdate(loaded, { content: true })).not.toHaveProperty("excerpt");
  });

  it("sends an emptied summary as empty, which asks the API to write it again", () => {
    expect(toUpdate(valid, { excerpt: true })).toEqual({ excerpt: "" });
  });

  it("sends an emptied tag list as empty, which clears it", () => {
    expect(toUpdate({ ...valid, tags: [] }, { tags: [] })).toEqual({
      tags: [],
    });
  });
});
