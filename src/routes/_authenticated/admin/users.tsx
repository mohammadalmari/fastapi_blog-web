import {
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import {
  rolesListRolesOptions,
  usersReadMeOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { AccountRow } from "@/features/rbac/components/account-row";
import { AdminNav } from "@/features/rbac/components/admin-nav";
import { usersOptions, usersSearchSchema } from "@/features/rbac/queries";
import { can } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

import { MarginRow } from "@/components/layout/margin-row";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/users")({
  validateSearch: usersSearchSchema,
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(usersReadMeOptions());
    if (!can(me, "users:read:any")) throw notFound();
    return { mayReadRoles: can(me, "roles:read") };
  },
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureInfiniteQueryData(usersOptions(deps)),
      // The roles decide which actions each account offers.
      context.mayReadRoles
        ? context.queryClient.ensureQueryData(rolesListRolesOptions())
        : null,
    ]),
  head: () => ({ meta: [{ title: `Accounts, ${SITE_NAME}` }] }),
  component: UsersPage,
});

const FILTERS = [
  { status: undefined, label: "All" },
  { status: "active", label: "Active" },
  { status: "deactivated", label: "Deactivated" },
] as const;

function UsersPage() {
  const { status } = Route.useSearch();
  const { mayReadRoles } = Route.useRouteContext();
  const { data: me } = useSuspenseQuery(usersReadMeOptions());
  const { data: roles } = useQuery({
    ...rolesListRolesOptions(),
    enabled: mayReadRoles,
  });
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(usersOptions({ status }));
  const users = data.pages.flatMap((page) => page.items);

  return (
    <>
      <MarginRow rail={<AdminNav />} contentClassName="pb-4">
        <h1 className="text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
          Accounts
        </h1>
        <nav aria-label="Show" className="mt-5 flex flex-wrap gap-x-6">
          {FILTERS.map((filter) => (
            <Link
              key={filter.label}
              to="/admin/users"
              search={{ status: filter.status }}
              aria-current={filter.status === status ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center underline-offset-[6px]",
                filter.status === status
                  ? "font-semibold underline decoration-primary decoration-2"
                  : "text-primary hover:underline"
              )}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      </MarginRow>

      {users.length === 0 ? (
        <MarginRow>
          <p className="font-serif text-lg">No account matches that.</p>
        </MarginRow>
      ) : (
        users.map((user) => (
          <AccountRow key={user.id} user={user} roles={roles} me={me} />
        ))
      )}

      {hasNextPage ? (
        <MarginRow contentClassName="pb-12">
          <Button
            variant="outline"
            size="lg"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? "Loading accounts" : "Load more accounts"}
          </Button>
        </MarginRow>
      ) : null}
    </>
  );
}
