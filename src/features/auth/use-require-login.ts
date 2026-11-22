import { useLocation, useNavigate } from "@tanstack/react-router";

import { useSessionStatus } from "@/features/auth/hooks";

/**
 * For an action that needs a login (liking, commenting). Returns a function
 * to call first: true when the reader is logged in; otherwise it sends them
 * to log in, to come back to this page afterwards, and returns false.
 */
export function useRequireLogin() {
  const status = useSessionStatus();
  const navigate = useNavigate();
  const here = useLocation({ select: (location) => location.href });

  return () => {
    if (status === "in") return true;
    void navigate({ to: "/login", search: { redirect: here } });
    return false;
  };
}
