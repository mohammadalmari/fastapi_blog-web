import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import type { RolePublic, UserAdmin, UserMe } from "@/api/generated/types.gen";
import { describeError } from "@/features/auth/form-errors";
import { RolesDialog } from "@/features/rbac/components/roles-dialog";
import { canChangeStatus } from "@/features/rbac/grants";
import { adminActions } from "@/features/rbac/mutations";
import { UserAvatar } from "@/features/users/components/author";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { MarginRow } from "@/components/layout/margin-row";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const action =
  "inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline";

/** One account in the administrator's list, with what may be done to it. */
export function AccountRow({
  user,
  roles,
  me,
}: {
  user: UserAdmin;
  /** Every role, or undefined for someone who may not see them. */
  roles: RolePublic[] | undefined;
  me: UserMe;
}) {
  const queryClient = useQueryClient();
  const [choosingRoles, setChoosingRoles] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const isMe = user.id === me.id;
  const mayAssign = can(me, "users:assign_roles") && roles !== undefined;
  // Without the roles to look at, whether it is allowed is the API's to say.
  const mayChangeStatus = roles
    ? canChangeStatus(me, user, roles)
    : can(me, "users:deactivate") && !isMe;

  const setActive = async (active: boolean) => {
    setBusy(true);
    setProblem(null);
    try {
      await adminActions(queryClient).setActive(user, active);
    } catch (error) {
      setProblem(describeError(error));
    }
    setBusy(false);
    setConfirming(false);
  };

  return (
    <article aria-label={user.username}>
      <MarginRow
        railClassName="flex flex-col items-start gap-2 pt-6"
        contentClassName="flex flex-wrap items-start gap-x-6 gap-y-2 py-5"
        rail={
          <>
            {user.is_active ? null : (
              <Badge variant="highlight">Deactivated</Badge>
            )}
            <div>Joined</div>
            <time
              dateTime={user.created_at}
              className="font-semibold text-foreground"
            >
              {formatDate(user.created_at)}
            </time>
          </>
        }
      >
        <UserAvatar person={user} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight break-words">
            {/* A deactivated account has no public profile to link to. */}
            {user.is_active ? (
              <Link
                to="/users/$username"
                params={{ username: user.username }}
                className="underline-offset-4 hover:underline"
              >
                {user.username}
              </Link>
            ) : (
              user.username
            )}
            {isMe ? (
              <span className="ms-2 text-base font-normal text-muted-foreground">
                (you)
              </span>
            ) : null}
          </h2>
          {user.display_name ? (
            <p dir="auto" className="text-muted-foreground">
              {user.display_name}
            </p>
          ) : null}
          <p className="break-all">{user.email}</p>
          <p className="mt-1">
            <span className="text-muted-foreground">Roles: </span>
            {user.roles.length > 0
              ? user.roles.map((role) => role.name).join(", ")
              : "none"}
          </p>
          <div className="flex flex-wrap gap-x-5 text-[15px]">
            {mayAssign ? (
              <button
                type="button"
                className={action}
                onClick={() => setChoosingRoles(true)}
              >
                Change roles
              </button>
            ) : null}
            {mayChangeStatus ? (
              user.is_active ? (
                <button
                  type="button"
                  className={cn(action, "text-destructive")}
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  className={action}
                  disabled={busy}
                  onClick={() => void setActive(true)}
                >
                  {busy ? "Reactivating" : "Reactivate"}
                </button>
              )
            ) : null}
          </div>
          {problem ? (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          ) : null}
        </div>
      </MarginRow>

      {choosingRoles && roles ? (
        <RolesDialog
          user={user}
          roles={roles}
          me={me}
          open={choosingRoles}
          onOpenChange={setChoosingRoles}
        />
      ) : null}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {user.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              They are logged out at once and can&apos;t log in until the
              account is reactivated. Their profile disappears; their posts and
              comments stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it active</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                // The dialog stays until the API has answered.
                event.preventDefault();
                void setActive(false);
              }}
            >
              {busy ? "Deactivating" : "Deactivate account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
