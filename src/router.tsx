import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { isRetryable } from "@/api/errors";
import type { Session } from "@/features/auth/session";

import { ErrorPage } from "@/components/error-page";
import { NotFoundPage } from "@/components/not-found-page";

import { routeTree } from "./routeTree.gen";

export function createAppRouter(session: Session) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failures, error) => failures < 2 && isRetryable(error),
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient, session },
    defaultPreload: "intent",
    // Query decides what is fresh; the router's own preload cache would
    // otherwise serve loaders for 30 seconds without asking it.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  // Logging in or out, here or in another tab, changes what every page may
  // show. A token that was only renewed changes nothing.
  let last = session.getStatus();
  session.subscribe(() => {
    const status = session.getStatus();
    if (status === last) return;
    const wasKnown = last !== "unknown";
    last = status;
    if (!wasKnown) return;

    if (status === "out") {
      // What was fetched as this person must not be shown to the next.
      queryClient.clear();
    } else {
      // Lists carry "liked by me", which a visitor's copy doesn't have.
      void queryClient.invalidateQueries();
    }
    // Runs every route's guard again: off a private page on logout, off the
    // login page on login.
    void router.invalidate();
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
