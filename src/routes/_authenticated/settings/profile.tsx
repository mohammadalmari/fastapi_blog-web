import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { usersReadMeOptions } from "@/api/generated/@tanstack/react-query.gen";
import { can } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usersReadMeOptions()),
  head: () => ({ meta: [{ title: `Your account, ${SITE_NAME}` }] }),
  component: ProfilePage,
});

const joined = new Intl.DateTimeFormat("en", { dateStyle: "long" });

// Read-only for now: editing the profile, the avatar and the password come
// with the account-settings stage of the plan.
function ProfilePage() {
  const { data: me } = useSuspenseQuery(usersReadMeOptions());

  // What the account can do, in the reader's words; the permission ids
  // behind them are the administrator's vocabulary.
  const abilities = [
    can(me, "comments:create") ? "Comment on posts" : null,
    can(me, "likes:create") ? "Like posts and comments" : null,
    can(me, "posts:create") ? "Write posts" : null,
    can(me, "posts:publish:own") ? "Publish your posts" : null,
    can(me, "roles:read") ? "Manage roles" : null,
    can(me, "users:read:any") ? "Manage accounts" : null,
  ].filter((ability) => ability !== null);

  return (
    <MarginRow
      rail={
        <>
          <div>Joined</div>
          <div className="font-semibold text-foreground">
            {joined.format(new Date(me.created_at))}
          </div>
        </>
      }
    >
      <h1
        dir="auto"
        className="text-4xl leading-none font-extrabold tracking-tighter break-words sm:text-6xl"
      >
        {me.display_name || me.username}
      </h1>
      <dl className="mt-8 grid max-w-xl grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-lg">
        <dt className="text-muted-foreground">Username</dt>
        <dd dir="auto" className="font-semibold break-words">
          {me.username}
        </dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd className="font-semibold break-all">{me.email}</dd>
        <dt className="text-muted-foreground">Roles</dt>
        <dd className="font-semibold">
          {me.roles.length > 0
            ? me.roles.map((role) => role.name).join(", ")
            : "None"}
        </dd>
      </dl>
      <h2 className="mt-10 text-2xl font-semibold tracking-tight">
        What you can do here
      </h2>
      {abilities.length > 0 ? (
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 font-serif text-lg">
          {abilities.map((ability) => (
            <li key={ability}>{ability}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 font-serif text-lg">
          Read. An administrator can give this account more.
        </p>
      )}
    </MarginRow>
  );
}
