import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { usersReadMeOptions } from "@/api/generated/@tanstack/react-query.gen";
import { PostEditor } from "@/features/posts/components/post-editor";
import { can } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";

export const Route = createFileRoute("/_authenticated/write")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usersReadMeOptions()),
  head: () => ({ meta: [{ title: `Write, ${SITE_NAME}` }] }),
  component: WritePage,
});

function WritePage() {
  const { data: me } = useSuspenseQuery(usersReadMeOptions());

  // The page is no secret, so someone who may not write is told why,
  // not shown "not found".
  if (!can(me, "posts:create")) {
    return (
      <MarginRow rail="Write">
        <h1 className="max-w-[20ch] text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
          This account can&apos;t write posts yet
        </h1>
        <p className="mt-4 max-w-[60ch] font-serif text-lg">
          Writing is a permission an administrator gives. Until then you can
          read, comment and like.
        </p>
        <p className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            Go to the posts
          </Link>
        </p>
      </MarginRow>
    );
  }

  return (
    <>
      <h1 className="sr-only">Write a post</h1>
      <PostEditor me={me} />
    </>
  );
}
