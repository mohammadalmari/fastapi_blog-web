import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";

import type { Session } from "@/features/auth/session";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";
import { SiteHeader } from "@/components/layout/site-header";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  session: Session;
}>()({
  // Every guard below can rely on the status being known.
  beforeLoad: ({ context }) => context.session.ready(),
  head: () => ({ meta: [{ title: SITE_NAME }] }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <HeadContent />
      {/* The first stop for a keyboard: past the header, to the page. */}
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to the page
      </a>
      <div className="mx-auto flex min-h-svh max-w-[1120px] flex-col px-4 sm:px-6">
        <SiteHeader />
        {/* tabIndex -1: the skip link can move focus here. */}
        <main
          id="main"
          tabIndex={-1}
          className="flex flex-1 flex-col outline-none"
        >
          <Outlet />
          {/* Carries the margin line down to the footer on a short page. */}
          <MarginRow className="flex-1" railClassName="pt-0">
            {null}
          </MarginRow>
        </main>
        <footer>
          <MarginRow
            railClassName="pt-6"
            contentClassName="pb-10 text-sm text-muted-foreground"
          >
            {SITE_NAME}. Posts, drafts and the talk around them.
          </MarginRow>
        </footer>
      </div>
    </>
  );
}
