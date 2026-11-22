import type { ReactNode } from "react";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";

import { PostListItem } from "@/features/posts/components/post-list-item";
import type { PostListOptions } from "@/features/posts/queries";

import { MarginRow } from "@/components/layout/margin-row";

import { Button } from "@/components/ui/button";

/**
 * A list of posts with a button for the next lot. The route that shows it
 * loads the same `options` first (`feedOptions`, `myPostsOptions`).
 */
export function PostFeed({
  options,
  leadFirst = false,
  own = false,
  empty,
}: {
  options: PostListOptions;
  /** Set the newest post larger than the rest. */
  leadFirst?: boolean;
  /** The reader's own posts: say which are drafts, and offer to edit. */
  own?: boolean;
  /** What to say when there is nothing to list. */
  empty: ReactNode;
}) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, error } =
    useSuspenseInfiniteQuery(options);
  const posts = data.pages.flatMap((page) => page.items);

  if (posts.length === 0) {
    return <MarginRow>{empty}</MarginRow>;
  }

  return (
    <>
      {posts.map((post, index) => (
        <PostListItem
          key={post.id}
          post={post}
          lead={leadFirst && index === 0}
          own={own}
        />
      ))}
      {hasNextPage ? (
        <MarginRow contentClassName="pb-12">
          <Button
            variant="outline"
            size="lg"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? "Loading posts" : "Load more posts"}
          </Button>
          {/* The posts already shown stay; only the next lot failed. */}
          {error && !isFetchingNextPage ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              The next posts didn&apos;t load. {error.message}
            </p>
          ) : null}
        </MarginRow>
      ) : null}
    </>
  );
}
