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

The foundation is in place: routing, the generated API client, the page
layout, error handling and both kinds of test. One page shows data from the
API, `/tags`. Accounts come next, then reading, writing and the rest.

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
e2e/                Playwright tests
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
bun run build        # type check, then build into dist/
bun run preview      # serve the build
```

The end-to-end tests need a browser once: `bunx playwright install chromium`.
Today they answer the pages' requests themselves, so they need no API; flows
against the real API start with accounts.

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
