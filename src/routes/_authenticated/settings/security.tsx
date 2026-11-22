import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { authLogout, authLogoutAll } from "@/api/generated/sdk.gen";
import { PasswordForm } from "@/features/auth/components/password-form";
import { describeError } from "@/features/auth/form-errors";
import { useSession } from "@/features/auth/hooks";
import { leaveLoginNotice } from "@/lib/notice";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";
import { SettingsNav } from "@/components/layout/settings-nav";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/security")({
  head: () => ({ meta: [{ title: `Security, ${SITE_NAME}` }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const session = useSession();
  const [leaving, setLeaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const logOutEverywhere = async () => {
    setLeaving(true);
    setProblem(null);
    try {
      await authLogoutAll({ throwOnError: true });
    } catch (error) {
      setLeaving(false);
      return setProblem(describeError(error));
    }
    leaveLoginNotice("You are logged out everywhere. Log in again here.");
    // Every session is over on the server; this clears this browser's cookie.
    await authLogout().catch(() => undefined);
    session.logout();
  };

  return (
    <>
      <MarginRow rail={<SettingsNav />} contentClassName="pb-10">
        <h1 className="text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
          Security
        </h1>
        <h2 className="mt-8 text-2xl font-semibold tracking-tight">
          Change your password
        </h2>
        <p className="mt-2 mb-6 max-w-[56ch] font-serif text-lg">
          Changing it logs you out everywhere, here too. You log in again with
          the new one.
        </p>
        <PasswordForm />
      </MarginRow>

      <MarginRow contentClassName="pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">
          Log out everywhere
        </h2>
        <p className="mt-2 mb-5 max-w-[56ch] font-serif text-lg">
          Ends every session of this account: other browsers, other devices, and
          this one. Somewhere already open can keep working for up to fifteen
          minutes.
        </p>
        <Button
          variant="outline"
          size="lg"
          disabled={leaving}
          onClick={logOutEverywhere}
        >
          {leaving ? "Logging out" : "Log out everywhere"}
        </Button>
        {problem ? (
          <p role="alert" className="mt-3 text-destructive">
            {problem}
          </p>
        ) : null}
      </MarginRow>
    </>
  );
}
