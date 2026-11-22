import { useState } from "react";

import { Link, useLocation } from "@tanstack/react-router";

import { authLogout } from "@/api/generated/sdk.gen";
import { useMe, useSession, useSessionStatus } from "@/features/auth/hooks";

import { Button } from "@/components/ui/button";

const navLink =
  "inline-flex min-h-11 items-center font-semibold text-foreground decoration-primary decoration-2 underline-offset-[6px] hover:underline data-[status=active]:underline";

/** The right end of the header: who is logged in, or the way in. */
export function AccountMenu() {
  const session = useSession();
  const status = useSessionStatus();
  const me = useMe();
  // Logging in from a page brings the reader back to it.
  const here = useLocation({ select: (location) => location.href });
  const [leaving, setLeaving] = useState(false);

  // Nothing until it is known which to show: the wrong one would flash.
  if (status === "unknown") return null;

  if (status === "out") {
    const search = { redirect: here };
    return (
      <>
        <Link to="/login" search={search} className={navLink}>
          Log in
        </Link>
        <Link to="/register" search={search} className={navLink}>
          Sign up
        </Link>
      </>
    );
  }

  const logOut = async () => {
    setLeaving(true);
    try {
      // Ends the session on the server and clears the cookie. If that
      // fails the tab still forgets its token: the person asked to leave.
      await authLogout();
    } finally {
      session.logout();
      setLeaving(false);
    }
  };

  return (
    <>
      <Link to="/settings/profile" className={navLink}>
        <span dir="auto" className="max-w-[16ch] truncate">
          {me ? me.username : "Account"}
        </span>
      </Link>
      <Button variant="outline" size="lg" disabled={leaving} onClick={logOut}>
        Log out
      </Button>
    </>
  );
}
