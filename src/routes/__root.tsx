import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";

import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";
import { SiteHeader } from "@/components/layout/site-header";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({ meta: [{ title: SITE_NAME }] }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <HeadContent />
      <div className="mx-auto flex min-h-svh max-w-[1120px] flex-col px-6">
        <SiteHeader />
        <main className="flex flex-1 flex-col">
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
