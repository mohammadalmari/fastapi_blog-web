import { createFileRoute } from "@tanstack/react-router";

import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin/roles/")({
  head: () => ({ meta: [{ title: `Roles, ${SITE_NAME}` }] }),
  component: RolesIndex,
});

function RolesIndex() {
  return (
    <>
      <h1 className="text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
        Roles
      </h1>
      <p className="mt-5 max-w-[58ch] font-serif text-lg">
        A role is a named set of permissions. An account can hold several, and
        may do whatever any of them allows. Choose a role to see or change what
        it allows.
      </p>
    </>
  );
}
