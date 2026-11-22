import type { Page } from "@playwright/test";

import { mockLoggedIn, mockReading, post } from "./mocks.ts";

// Every page of the app, with the answers it needs, for the checks that go
// through them all (accessibility, small screens). `ready` is text the
// page shows once it has loaded.

export const PAGES: Array<{ path: string; ready: string; loggedIn?: boolean }> =
  [
    { path: "/", ready: "Post number 1" },
    { path: "/tags", ready: "Tags" },
    { path: "/posts/post-1-a1b2c3", ready: "Post number 1" },
    { path: "/users/sami", ready: "Sami H." },
    { path: "/login", ready: "Log in" },
    { path: "/register", ready: "Sign up" },
    { path: "/no/such/page", ready: "Nothing is written here" },
    { path: "/write", ready: "Title", loggedIn: true },
    { path: "/me/posts", ready: "Your posts", loggedIn: true },
    { path: "/posts/post-1-a1b2c3/edit", ready: "Title", loggedIn: true },
    { path: "/settings/profile", ready: "Your profile", loggedIn: true },
    { path: "/settings/security", ready: "Security", loggedIn: true },
    { path: "/admin/users", ready: "Accounts", loggedIn: true },
    {
      path: "/admin/roles/665f1c2e8a4b3d0012345698",
      ready: "reader",
      loggedIn: true,
    },
  ];

export async function prepare(page: Page, loggedIn: boolean) {
  await mockReading(page, () => ({
    items: [post(1), post(2, { title: "ملاحظات", tags: ["عربي"] })],
    next_cursor: "more",
  }));
  await page.route("**/api/v1/posts/post-1-a1b2c3", (route) =>
    route.fulfill({
      json: post(1, {
        author: { ...post(1).author, id: "665f1c2e8a4b3d0012345601" },
        content:
          "Some text with a [link](/tags).\n\n## A heading\n\n> A quote.\n\n```python\nprint('hi')\n```",
      }),
    })
  );
  await page.route(/\/api\/v1\/posts\/[^/]+\/comments/, (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "665f1c2e8a4b3d0012345a01",
            post_id: post(1).id,
            parent_id: null,
            content: "A comment.",
            author: post(1).author,
            is_deleted: false,
            reply_count: 1,
            like_count: 2,
            liked_by_me: false,
            created_at: "2026-11-19T12:00:00Z",
            updated_at: "2026-11-19T12:00:00Z",
          },
        ],
        next_cursor: null,
      },
    })
  );
  await page.route("**/api/v1/users/sami", (route) =>
    route.fulfill({
      json: {
        id: "665f1c2e8a4b3d0012345601",
        username: "sami",
        display_name: "Sami H.",
        bio: "Writes about tokens.",
        created_at: "2026-10-01T12:00:00Z",
        avatar_url: null,
      },
    })
  );
  if (loggedIn) await mockLoggedIn(page);
}
