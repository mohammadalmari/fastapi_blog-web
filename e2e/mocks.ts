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
  // No comments, on any post, unless a test answers this itself.
  await page.route(/\/api\/v1\/posts\/[^/]+\/comments/, (route) =>
    route.fulfill({ json: { items: [], next_cursor: null } })
  );
  await page.route(/\/api\/v1\/posts(\?.*)?$/, (route) =>
    route.fulfill({ json: feed(new URL(route.request().url()).searchParams) })
  );
}

const ALL_PERMISSIONS = [
  "posts:create",
  "posts:update:own",
  "posts:update:any",
  "posts:delete:own",
  "posts:delete:any",
  "posts:publish:own",
  "posts:publish:any",
  "posts:read_drafts:any",
  "comments:create",
  "comments:update:own",
  "comments:delete:own",
  "comments:delete:any",
  "likes:create",
  "users:read:any",
  "users:deactivate",
  "users:assign_roles",
  "roles:read",
  "roles:create",
  "roles:update",
  "roles:delete",
];

export const adminMe = {
  id: author.id,
  email: "sami@example.com",
  username: author.username,
  display_name: "Sami H.",
  bio: "Writes about tokens.",
  is_active: true,
  created_at: "2026-10-01T12:00:00Z",
  roles: [{ id: "665f1c2e8a4b3d0012345699", name: "admin" }],
  permissions: ALL_PERMISSIONS,
  avatar_url: null,
};

export const roles = [
  {
    id: "665f1c2e8a4b3d0012345699",
    name: "admin",
    description: "Everything",
    permissions: ALL_PERMISSIONS,
    is_system: true,
    is_default: false,
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
  },
  {
    id: "665f1c2e8a4b3d0012345698",
    name: "reader",
    description: "Reads, comments and likes",
    permissions: ["comments:create", "likes:create"],
    is_system: true,
    is_default: true,
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
  },
];

/**
 * Logged in as an administrator, as far as the page can tell: the browser
 * remembers a login, the refresh answers with a token, and "who am I" with
 * `adminMe`. Plus the lists the admin pages ask for.
 */
export async function mockLoggedIn(page: Page) {
  // Runs in the page, which has a localStorage; this file doesn't know that.
  await page.addInitScript(
    "window.localStorage.setItem('draftwork.logged-in', '1')"
  );
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({ json: { access_token: "token", expires_in: 900 } })
  );
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({ json: adminMe })
  );
  await page.route(/\/api\/v1\/users\/me\/posts/, (route) =>
    route.fulfill({
      json: {
        items: [post(1, { status: "draft", published_at: null })],
        next_cursor: null,
      },
    })
  );
  await page.route(/\/api\/v1\/users(\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        items: [
          { ...adminMe, permissions: undefined },
          {
            id: "665f1c2e8a4b3d0012345602",
            email: "huda@example.com",
            username: "huda",
            display_name: null,
            is_active: false,
            created_at: "2026-10-02T12:00:00Z",
            roles: [{ id: roles[1].id, name: "reader" }],
            avatar_url: null,
          },
        ],
        next_cursor: null,
      },
    })
  );
  await page.route("**/api/v1/roles", (route) =>
    route.fulfill({ json: roles })
  );
  await page.route("**/api/v1/permissions", (route) =>
    route.fulfill({
      json: ALL_PERMISSIONS.map((id) => ({
        id,
        resource: id.split(":")[0],
        description: `Allows ${id}`,
      })),
    })
  );
}
