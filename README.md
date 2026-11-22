# Draftwork Blog Web

The web frontend for [Draftwork Blog](https://github.com/mohammadalmari/fastapi_blog),
a multi-user blog with roles and permissions. A single-page app that calls
the API straight from the browser.

Built with [Bun](https://bun.sh/) (dependencies), [Vite](https://vite.dev/),
React and TypeScript, [TanStack Router](https://tanstack.com/router) and
[TanStack Query](https://tanstack.com/query),
[Tailwind CSS](https://tailwindcss.com/) and
[shadcn/ui](https://ui.shadcn.com/).

## Status

Four stages of the plan are built. The foundation: routing, the generated
API client, the page layout, error handling and tests. Accounts: sign up,
log in, stay logged in across reloads and tabs, log out. Reading: the feed
with its filters, posts with their Markdown rendered safely, profiles. And
writing: an editor with a live preview, drafts, publishing, and a list of
your own posts. Comments and likes come next.

## Getting started

```bash
bun install
bun run dev
```

The dev server prints its address, http://localhost:5173 by default.

The app needs the API running in debug mode on http://127.0.0.1:8000; the
API's README says how to start it. The dev server passes `/api`, `/media`
and `/health` on to it, so the browser only ever talks to one origin. Set
`API_URL` to point at an API somewhere else.

## Layout

```
src/
├── routes/         one file per page; routeTree.gen.ts is generated from them
├── api/
│   ├── generated/  the client, generated from openapi.json; never edited
│   ├── client.ts   sets the client up, once
│   └── errors.ts   one error shape for every failed request
├── features/       queries and components, a folder per API feature
├── components/
│   ├── ui/         shadcn/ui components, added by its CLI
│   └── layout/     the header and the margin row every page is built from
├── lib/            small pure helpers
└── test/           test setup
e2e/                Playwright tests that need no API
e2e-api/            Playwright tests against the real API
```

Every page is rows of `MarginRow`: a narrow rail for what the page knows
about the writing (dates, authors, counts, actions), the blue margin line,
then the writing itself. The colours and the two typefaces are set in
`src/index.css`.

### The API client

```bash
bun run api:generate
```

exports the schema from the API's code in `../fastapi_blog` into
`openapi.json`, then regenerates `src/api/generated/` from it. Run it after
the API's routes or schemas change, and commit both. They are committed so
that a build needs neither the API's code nor a running server.

### Staying logged in

The API gives a short-lived access token (fifteen minutes) and a refresh
cookie that scripts can't read. The app keeps the token in memory only,
never in `localStorage`, so a reload starts without one and trades the
cookie for a new one (`src/features/auth/session.ts`).

- Requests go through `createAuthFetch` (`auth-fetch.ts`): it sends the
  token, and when the API refuses it, gets a new one and sends the request
  once more.
- The API lets a refresh cookie be used once and ends the session on a
  second use. Two tabs refreshing together would do that, so tabs take
  turns with a lock and tell each other the new token over a channel. Login
  and logout reach every tab the same way.
- A page that needs a login goes in `src/routes/_authenticated/`. A visitor
  is sent to `/login` and brought back afterwards; only paths on this site
  are accepted as the way back (`src/lib/redirect.ts`).
- What to show someone is decided by `can(me, "posts:create")`
  (`src/lib/permissions.ts`) from the permissions the API lists, never by
  role name. It decides what is shown; the API decides what is allowed.

### Showing what users wrote

Everything a user typed is untrusted. Titles, summaries, names, tags and
bios are rendered as text. A post's body is Markdown and goes through
`<Markdown>` (`src/components/markdown.tsx`), which builds nothing from
HTML inside it, drops `javascript:` and similar addresses, and sanitizes
the result. Its styles are the `.markdown` rules in `src/index.css`.

### Writing

`PostEditor` (`src/features/posts/components/post-editor.tsx`) is the form
behind both `/write` and `/posts/$slug/edit`. Which of its buttons appear
follows the permissions the API will check (`features/posts/permissions.ts`):
an author on their own posts, an editor on anyone's, and editing a
published post only for someone who may also publish it.

- The form's rules mirror the API's so a problem is named before sending:
  lengths, at most ten tags, tags shown as they will be stored
  (`features/posts/tags.ts`), no invisible characters in a title
  (`src/lib/text.ts`). The API checks again and has the last word.
- A save sends only what changed. Sending back the summary the API wrote
  would make it the author's, and it would stop following the post.
- Leaving with unsaved changes asks first.

A page for something that doesn't exist, was deleted, or may not be seen
by this reader (someone else's draft) is the same "not found" page: a
loader wraps its request in `orNotFound` (`src/api/not-found.ts`).

Every failed request is thrown as an `ApiError` (`src/api/errors.ts`): the
status, the API's message, the messages per field for invalid input, how
long a 429 asks to wait, and the request id to quote in a report.

## Stack

| Area | Choice |
| ---- | ------ |
| Routing | TanStack Router |
| Data from the API | TanStack Query |
| API client | Generated from the API's `/openapi.json` with `@hey-api/openapi-ts`; request and response types are never written by hand |
| Components | shadcn/ui on Radix, with the Nova preset (`components.json`) |
| Forms | React Hook Form with Zod |
| Post content | `react-markdown` with `rehype-sanitize`: posts are Markdown written by users, so it is untrusted |
| Tests | Vitest and Testing Library for units, Playwright for end-to-end |

Why a single-page app: the API hands the access token to the page and keeps
the refresh token in a cookie that only its `/api/v1/auth` routes receive,
so a server rendering the pages could not tell who is logged in.

## Development

```bash
bun run typecheck    # type check
bun run lint         # lint
bun run format       # format
bun run test         # unit and component tests (Vitest)
bun run test:e2e     # end-to-end tests (Playwright), against a fresh build
bun run test:e2e:api # the flows that need the real API
bun run build        # type check, then build into dist/
bun run preview      # serve the build
```

The end-to-end tests need a browser once: `bunx playwright install chromium`.
There are two sets:

- `bun run test:e2e` (`e2e/`) answers the pages' requests itself, needs no
  API, and runs in CI.
- `bun run test:e2e:api` (`e2e-api/`) runs the flows that need the real API:
  sign-up, login, two tabs, reading and writing posts. It starts its own API from `../fastapi_blog` on
  port 8010, in a database named `e2e_draftwork_web` on the server the API's
  `.env` points at, and drops that database before and after. It makes an
  administrator with the API's seed command, since only an administrator
  can hand out the role that writes posts. It is not in CI yet.

- **Lint** is ESLint with the TypeScript, React Hooks and React Refresh
  rules, plus sorted imports and exports (`eslint.config.js`).
  `bunx eslint . --fix` puts imports in order.
- **Format** is Prettier with the Tailwind plugin, which also sorts class
  names inside `cn()` and `cva()` (`.prettierrc`).

Format, lint, type check, build and both sets of tests also run on GitHub
for every push to `main` and every pull request
([.github/workflows/ci.yml](.github/workflows/ci.yml)), with `--check` on
the formatter and `--frozen-lockfile` on the install, so unformatted code or
a stale `bun.lock` fails.

### Components

shadcn/ui components are added as source files under `src/components/ui/`
by the CLI, never copied in by hand:

```bash
bunx --bun shadcn@latest add dialog
```

```tsx
import { Button } from "@/components/ui/button";
```

`@/` is `src/`.

### Dependencies

Add them with `bun add` (`bun add -d` for tools), not by editing
`package.json`.

`bunfig.toml` sets a minimum release age of two days: bun will not install a
version published more recently than that, so a compromised release has time
to be noticed and pulled. If you need a fix sooner, wait, or pin the last
version old enough.
