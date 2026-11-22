import type { ReactNode } from "react";

import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";

/**
 * Render something that contains links. A `<Link>` needs a router around
 * it; this one has a single page, the thing under test.
 */
export async function renderWithRouter(ui: ReactNode) {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => <div data-testid="under-test">{ui}</div>,
    }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  // The app's router is registered for types; this one is a stand-in.
  const result = render(<RouterProvider router={router as never} />);
  // The router renders after its first (empty) load.
  await screen.findByTestId("under-test");
  return result;
}
