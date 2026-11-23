import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";

import type { Session } from "@/features/auth/session";
import { SITE_NAME } from "@/lib/site";

import { PageShell } from "@/components/layout/page-shell";
import { RootPending } from "@/components/root-pending";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  session: Session;
}>()({
  // Every guard below can rely on the status being known.
  beforeLoad: ({ context }) => context.session.ready(),
  head: () => ({ meta: [{ title: SITE_NAME }] }),
  component: RootLayout,
  // Without its own, the root's wait would show a bare outline with no
  // header, and everything would jump when the page came in.
  pendingComponent: RootPending,
});

function RootLayout() {
  return (
    <>
      <HeadContent />
      <PageShell>
        <Outlet />
      </PageShell>
    </>
  );
}
