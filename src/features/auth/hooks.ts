import { useSyncExternalStore } from "react";

import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { usersReadMeOptions } from "@/api/generated/@tanstack/react-query.gen";

const root = getRouteApi("__root__");

export function useSession() {
  return root.useRouteContext({ select: (context) => context.session });
}

/** "in" or "out"; "unknown" only before the first page has loaded. */
export function useSessionStatus() {
  const session = useSession();
  return useSyncExternalStore(session.subscribe, session.getStatus);
}

/**
 * The caller's account, roles and permissions; undefined for a visitor and
 * while it loads. Ask `can(me, ...)` what to show.
 */
export function useMe() {
  const status = useSessionStatus();
  const { data } = useQuery({
    ...usersReadMeOptions(),
    enabled: status === "in",
    // Roles change rarely, and the API checks every request anyway.
    staleTime: 60_000,
  });
  return status === "in" ? data : undefined;
}
