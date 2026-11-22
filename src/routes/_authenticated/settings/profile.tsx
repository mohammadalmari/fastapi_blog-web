import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { usersReadMeOptions } from "@/api/generated/@tanstack/react-query.gen";
import { AvatarField } from "@/features/users/components/avatar-field";
import { ProfileForm } from "@/features/users/components/profile-form";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";
import { SettingsNav } from "@/components/layout/settings-nav";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usersReadMeOptions()),
  head: () => ({ meta: [{ title: `Your profile, ${SITE_NAME}` }] }),
  component: ProfilePage,
});

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
    <>
      <MarginRow rail={<SettingsNav />} contentClassName="pb-10">
        <h1 className="text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
          Your profile
        </h1>
        <p className="mt-4 mb-8 max-w-[56ch] font-serif text-lg">
          What others see on{" "}
          <Link
            to="/users/$username"
            params={{ username: me.username }}
            className="font-sans font-semibold text-primary underline underline-offset-4"
          >
            your profile page
          </Link>{" "}
          and next to what you write.
        </p>
        <ProfileForm me={me} />
      </MarginRow>

      <MarginRow rail="Picture" contentClassName="pb-10">
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Picture</h2>
        <AvatarField me={me} />
      </MarginRow>

      <MarginRow
        rail={
          <>
            <div>Joined</div>
            <div className="font-semibold text-foreground">
              {formatDate(me.created_at)}
            </div>
          </>
        }
        contentClassName="pb-14"
      >
        <h2 className="text-2xl font-semibold tracking-tight">Your account</h2>
        <dl className="mt-4 grid max-w-xl grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-lg">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-semibold break-all">{me.email}</dd>
          <dt className="text-muted-foreground">Roles</dt>
          <dd className="font-semibold">
            {me.roles.length > 0
              ? me.roles.map((role) => role.name).join(", ")
              : "None"}
          </dd>
        </dl>
        <h3 className="mt-8 text-lg font-semibold">What you can do here</h3>
        {abilities.length > 0 ? (
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 font-serif text-lg">
            {abilities.map((ability) => (
              <li key={ability}>{ability}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 font-serif text-lg">
            Read. An administrator can give this account more.
          </p>
        )}
      </MarginRow>
    </>
  );
}
