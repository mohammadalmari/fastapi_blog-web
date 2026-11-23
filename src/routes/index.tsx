import { createFileRoute, Link } from "@tanstack/react-router";

import { postsListTagsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { FeedSkeleton } from "@/features/posts/components/feed-skeleton";
import { PostFeed } from "@/features/posts/components/post-feed";
import { TagFilter } from "@/features/posts/components/tag-filter";
import { feedOptions, feedSearchSchema } from "@/features/posts/queries";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";

export const Route = createFileRoute("/")({
  validateSearch: feedSearchSchema,
  loaderDeps: ({ search }) => ({ tag: search.tag, author: search.author }),
  loader: ({ context, deps }) => {
    // Started, not awaited: the tag row fills in when it arrives.
    void context.queryClient.prefetchQuery(postsListTagsOptions());
    return context.queryClient.ensureInfiniteQueryData(feedOptions(deps));
  },
  head: () => ({ meta: [{ title: SITE_NAME }] }),
  pendingComponent: FeedSkeleton,
  component: FeedPage,
});

const clearLink =
  "inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4";

function FeedPage() {
  const { tag, author } = Route.useSearch();
  const filtered = tag !== undefined || author !== undefined;

  return (
    <>
      <TagFilter active={tag} />
      {filtered ? (
        <MarginRow contentClassName="pb-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Posts
            {tag ? (
              <>
                {" tagged "}
                <span dir="auto">{tag}</span>
              </>
            ) : null}
            {author ? (
              <>
                {" by "}
                <span dir="auto">{author}</span>
              </>
            ) : null}
          </h1>
        </MarginRow>
      ) : (
        <h1 className="sr-only">Latest posts</h1>
      )}
      <PostFeed
        options={feedOptions({ tag, author })}
        leadFirst={!filtered}
        empty={
          filtered ? (
            <>
              <p className="font-serif text-lg">
                No published post matches that.
              </p>
              <Link to="/" className={clearLink}>
                Show all posts
              </Link>
            </>
          ) : (
            <p className="font-serif text-lg">
              Nothing has been published yet.
            </p>
          )
        }
      />
    </>
  );
}
