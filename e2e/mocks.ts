import type { Page } from "@playwright/test";

// These tests need no API: they answer the pages' requests themselves.
// What the answers must look like comes from src/api/generated/types.gen.ts.

export const author = {
  id: "665f1c2e8a4b3d0012345601",
  username: "sami",
  display_name: null,
  avatar_url: null,
};

export function post(number: number, changes: Record<string, unknown> = {}) {
  return {
    id: `665f1c2e8a4b3d00123456${String(number).padStart(2, "0")}`,
    slug: `post-${number}-a1b2c3`,
    title: `Post number ${number}`,
    excerpt: `What post ${number} is about.`,
    tags: ["python"],
    status: "published",
    published_at: "2026-11-18T12:00:00Z",
    created_at: "2026-11-17T12:00:00Z",
    updated_at: "2026-11-18T12:00:00Z",
    like_count: number,
    liked_by_me: false,
    comment_count: 1,
    author,
    ...changes,
  };
}

export const tags = [
  { name: "python", count: 14 },
  { name: "security", count: 1 },
];

/** Answer the tag list, and the feed with whatever `feed` returns. */
export async function mockReading(
  page: Page,
  feed: (query: URLSearchParams) => {
    items: unknown[];
    next_cursor: string | null;
  } = () => ({ items: [], next_cursor: null })
) {
  await page.route("**/api/v1/tags", (route) => route.fulfill({ json: tags }));
  await page.route(/\/api\/v1\/posts(\?.*)?$/, (route) =>
    route.fulfill({ json: feed(new URL(route.request().url()).searchParams) })
  );
}
