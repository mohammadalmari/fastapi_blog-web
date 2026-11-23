import { createElement } from "react";

import {
  type AnyRoute,
  rootRouteId,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";

import { PageShell } from "@/components/layout/page-shell";
import { PendingPage } from "@/components/pending-page";

/**
 * Shown while the root route waits, which on a first visit is the wait for
 * the session to be restored. It draws the frame every page has and, inside
 * it, the outline of the page on its way (its own `pendingComponent`), so
 * that when the page arrives nothing jumps.
 */
export function RootPending() {
  const router = useRouter();
  const routeId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  });
  const routes = router.routesById as unknown as Record<
    string,
    AnyRoute | undefined
  >;
  const outline =
    routeId && routeId !== rootRouteId
      ? routes[routeId]?.options.pendingComponent
      : undefined;

  return <PageShell>{createElement(outline ?? PendingPage)}</PageShell>;
}
