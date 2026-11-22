import { createFileRoute, notFound } from "@tanstack/react-router";

import { usersReadMeOptions } from "@/api/generated/@tanstack/react-query.gen";
import { can } from "@/lib/permissions";

// Every page under /admin. For someone without an administrator's
// permission there is no such page: the same "not found" as an address that
// never existed, and no link to it in the header.
//
// This is navigation, not protection: the API checks every request.
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(usersReadMeOptions());
    if (!can(me, "users:read:any") && !can(me, "roles:read")) throw notFound();
  },
});
