# FastAPI Blog Web

The web frontend for [FastAPI Blog](https://github.com/mohammadalmari/fastapi_blog),
a multi-user blog with roles and permissions. A single-page app that calls
the API straight from the browser.

Built with [Bun](https://bun.sh/) (dependencies), [Vite](https://vite.dev/),
React and TypeScript, [TanStack Router](https://tanstack.com/router) and
[TanStack Query](https://tanstack.com/query),
[Tailwind CSS](https://tailwindcss.com/) and
[shadcn/ui](https://ui.shadcn.com/).

## Status

The project is set up and its dependencies are installed, but no page is
built yet: `src/` still holds the starter screen. The router, the API
client, the dev proxy to the API and the test setup are the next steps.

## Getting started

```bash
bun install
bun run dev
```

The dev server prints its address, http://localhost:5173 by default.

The app will need the API running in debug mode on http://127.0.0.1:8000;
the API's README says how to start it.

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
bun run build        # type check, then build into dist/
bun run preview      # serve the build
```

- **Lint** is ESLint with the TypeScript, React Hooks and React Refresh
  rules, plus sorted imports and exports (`eslint.config.js`).
  `bunx eslint . --fix` puts imports in order.
- **Format** is Prettier with the Tailwind plugin, which also sorts class
  names inside `cn()` and `cva()` (`.prettierrc`).

Format, lint, type check and build also run on GitHub for every push to
`main` and every pull request
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
