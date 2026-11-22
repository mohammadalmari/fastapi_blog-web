import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  rolesListPermissionsOptions,
  rolesListRolesOptions,
  usersReadMeOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import type { RolePublic } from "@/api/generated/types.gen";
import { RoleForm } from "@/features/rbac/components/role-form";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin/roles/$roleId")({
  // The layout has loaded every role. One not among them may be newer than
  // that list (just created), so the list is asked for again once before
  // the answer is "not found".
  loader: async ({ context, params }) => {
    const find = (roles: RolePublic[]) =>
      roles.find((found) => found.id === params.roleId);
    const options = rolesListRolesOptions();
    let role = find(await context.queryClient.ensureQueryData(options));
    role ??= find(
      await context.queryClient.fetchQuery({ ...options, staleTime: 0 })
    );
    if (!role) throw notFound();
    return role.name;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData ?? "Role"}, ${SITE_NAME}` }],
  }),
  component: RolePage,
});

function RolePage() {
  const { roleId } = Route.useParams();
  const { data: roles } = useSuspenseQuery(rolesListRolesOptions());
  const { data: permissions } = useSuspenseQuery(rolesListPermissionsOptions());
  const { data: me } = useSuspenseQuery(usersReadMeOptions());
  const role = roles.find((found) => found.id === roleId);

  // Deleted while open: the list no longer has it.
  if (!role) return null;

  return (
    <>
      <h1 className="text-4xl leading-none font-extrabold tracking-tighter break-words sm:text-6xl">
        {role.name}
      </h1>
      <p className="mt-4 mb-8 max-w-[60ch] text-muted-foreground">
        A change here reaches everyone who holds this role on their next
        request.
      </p>
      {/* A different role is a different form, not this one with new values. */}
      <RoleForm key={role.id} role={role} permissions={permissions} me={me} />
    </>
  );
}
