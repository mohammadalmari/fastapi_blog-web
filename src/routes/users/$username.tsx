import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { usersReadProfileOptions } from "@/api/generated/@tanstack/react-query.gen";
import { orNotFound } from "@/api/not-found";
import { PostFeed } from "@/features/posts/components/post-feed";
import { feedOptions } from "@/features/posts/queries";
import { nameOf, UserAvatar } from "@/features/users/components/author";
import { formatDate } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";

const profileOptions = (username: string) =>
  usersReadProfileOptions({ path: { username } });

export const Route = createFileRoute("/users/$username")({
  loader: async ({ context, params: { username } }) => {
    // Both at once; the profile decides whether the page exists at all.
    const posts = context.queryClient
      .ensureInfiniteQueryData(feedOptions({ author: username }))
      // Its failure surfaces when the list renders; here it must not
      // become an unhandled rejection when the profile is a 404.
      .catch(() => undefined);
    const profile = await orNotFound(
      context.queryClient.ensureQueryData(profileOptions(username))
    );
    await posts;
    return profile;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData ? `${nameOf(loaderData)}, ${SITE_NAME}` : SITE_NAME,
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileOptions(username));

  return (
    <>
      <MarginRow
        railClassName="flex flex-col items-start gap-4 pt-9"
        contentClassName="pt-7 pb-8"
        rail={
          <>
            <UserAvatar person={profile} size="lg" className="size-20" />
            <div>
              <div>Joined</div>
              <time
                dateTime={profile.created_at}
                className="block font-semibold text-foreground"
              >
                {formatDate(profile.created_at)}
              </time>
            </div>
          </>
        }
      >
        <h1
          dir="auto"
          className="text-4xl leading-none font-extrabold tracking-tighter break-words sm:text-6xl"
        >
          {nameOf(profile)}
        </h1>
        {profile.display_name ? (
          <p dir="auto" className="mt-2 text-lg text-muted-foreground">
            {profile.username}
          </p>
        ) : null}
        {profile.bio ? (
          <p
            dir="auto"
            className="mt-5 max-w-[60ch] font-serif text-lg break-words whitespace-pre-line"
          >
            {profile.bio}
          </p>
        ) : null}
      </MarginRow>
      <MarginRow contentClassName="pt-2 pb-0">
        <h2 className="text-2xl font-semibold tracking-tight">Posts</h2>
      </MarginRow>
      <PostFeed
        options={feedOptions({ author: username })}
        empty={<p className="font-serif text-lg">Nothing published yet.</p>}
      />
    </>
  );
}
