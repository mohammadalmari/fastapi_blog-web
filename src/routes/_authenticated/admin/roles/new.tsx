import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  rolesListPermissionsOptions,
  usersReadMeOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { RoleForm } from "@/features/rbac/components/role-form";
import { can } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin/roles/new")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(usersReadMeOptions());
    if (!can(me, "roles:create")) throw notFound();
  },
  head: () => ({ meta: [{ title: `New role, ${SITE_NAME}` }] }),
  component: NewRolePage,
});

function NewRolePage() {
  const { data: me } = useSuspenseQuery(usersReadMeOptions());
  const { data: permissions } = useSuspenseQuery(rolesListPermissionsOptions());

  return (
    <>
      <h1 className="mb-8 text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
        New role
      </h1>
      <RoleForm permissions={permissions} me={me} />
    </>
  );
}
