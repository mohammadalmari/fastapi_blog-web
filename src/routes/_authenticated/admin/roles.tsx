import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  Outlet,
} from "@tanstack/react-router";

import {
  rolesListPermissionsOptions,
  rolesListRolesOptions,
  usersReadMeOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { AdminNav } from "@/features/rbac/components/admin-nav";
import { can } from "@/lib/permissions";

import { MarginRow } from "@/components/layout/margin-row";

import { Badge } from "@/components/ui/badge";

// The roles pages: the list of roles in the rail, the chosen one beside it.
export const Route = createFileRoute("/_authenticated/admin/roles")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(usersReadMeOptions());
    if (!can(me, "roles:read")) throw notFound();
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(rolesListRolesOptions()),
      context.queryClient.ensureQueryData(rolesListPermissionsOptions()),
    ]),
  component: RolesLayout,
});

const roleLink =
  "inline-flex min-h-11 max-w-full items-center gap-2 text-foreground underline-offset-[6px] hover:underline data-[status=active]:font-semibold data-[status=active]:text-primary";

function RolesLayout() {
  const { data: roles } = useSuspenseQuery(rolesListRolesOptions());
  const { data: me } = useSuspenseQuery(usersReadMeOptions());

  return (
    <MarginRow
      railClassName="flex flex-col items-start gap-5"
      contentClassName="pb-16"
      rail={
        <>
          <AdminNav />
          <nav aria-label="Roles" className="flex flex-col items-start">
            {roles.map((role) => (
              <Link
                key={role.id}
                to="/admin/roles/$roleId"
                params={{ roleId: role.id }}
                className={roleLink}
              >
                <span className="truncate">{role.name}</span>
                {role.is_default ? (
                  <Badge variant="secondary">default</Badge>
                ) : null}
              </Link>
            ))}
          </nav>
          {can(me, "roles:create") ? (
            <Link
              to="/admin/roles/new"
              className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
            >
              New role
            </Link>
          ) : null}
        </>
      }
    >
      <Outlet />
    </MarginRow>
  );
}
