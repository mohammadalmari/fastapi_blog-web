import type { ReactNode } from "react";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";

import { PostListItem } from "@/features/posts/components/post-list-item";
import type { FeedFilters } from "@/features/posts/queries";
import { feedOptions } from "@/features/posts/queries";

import { MarginRow } from "@/components/layout/margin-row";

import { Button } from "@/components/ui/button";

/**
 * Published posts, newest first, with a button for the next lot. The route
 * that shows it loads `feedOptions(filters)` first.
 */
export function PostFeed({
  filters,
  leadFirst = false,
  empty,
}: {
  filters: FeedFilters;
  /** Set the newest post larger than the rest. */
  leadFirst?: boolean;
  /** What to say when there is nothing to list. */
  empty: ReactNode;
}) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, error } =
    useSuspenseInfiniteQuery(feedOptions(filters));
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
