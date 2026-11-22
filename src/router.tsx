import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { isRetryable } from "@/api/errors";

import { ErrorPage } from "@/components/error-page";
import { NotFoundPage } from "@/components/not-found-page";

import { routeTree } from "./routeTree.gen";

export function createAppRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failures, error) => failures < 2 && isRetryable(error),
      },
    },
  });

  return createRouter({
    routeTree,
    context: { queryClient },
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
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
