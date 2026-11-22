import { z } from "zod";
import { infiniteQueryOptions } from "@tanstack/react-query";

import {
  postsListMyPostsInfiniteQueryKey,
  postsListPostsInfiniteQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { postsListMyPosts, postsListPosts } from "@/api/generated/sdk.gen";
import type { PagePostSummary } from "@/api/generated/types.gen";

/** Posts fetched at a time; "Load more posts" asks for the next lot. */
export const FEED_PAGE_SIZE = 10;

// The same limits as the API's FeedParams. A value that breaks them is
// dropped, not sent: the API would answer 422, and a mistyped address should
// show the unfiltered list instead of an error page.
const filter = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).optional().catch(undefined);

export const feedSearchSchema = z.object({
  tag: filter(30),
  author: filter(30),
});

export type FeedFilters = z.infer<typeof feedSearchSchema>;

export const myPostsSearchSchema = z.object({
  status: z.enum(["draft", "published"]).optional().catch(undefined),
});

export type MyPostsFilters = z.infer<typeof myPostsSearchSchema>;

type Page = { cursor: string | null; signal: AbortSignal };

/**
 * A list of posts, a page at a time, each page starting where the last
 * ended.
 *
 * Written out, where other queries use the generated options: the generated
 * infinite options leave the cursor's handling to the caller anyway, and
 * their types don't fit `useSuspenseInfiniteQuery`.
 */
function pagedPosts(
  queryKey: readonly unknown[],
  fetchPage: (page: Page) => Promise<PagePostSummary>
) {
  return infiniteQueryOptions({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      fetchPage({ cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    // A cursor belongs to the list and filters that issued it; null ends it.
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });
}

/** Every list of posts takes these options, whichever list it is. */
export type PostListOptions = ReturnType<typeof pagedPosts>;

/** Published posts, newest first. */
export function feedOptions(filters: FeedFilters = {}): PostListOptions {
  const query = { ...filters, limit: FEED_PAGE_SIZE };

  return pagedPosts(
    postsListPostsInfiniteQueryKey({ query }),
    async ({ cursor, signal }) => {
      const { data } = await postsListPosts({
        query: { ...query, cursor },
        signal,
        throwOnError: true,
      });
      return data;
    }
  );
}

/** The caller's own posts, drafts included. */
export function myPostsOptions(filters: MyPostsFilters = {}): PostListOptions {
  const query = { ...filters, limit: FEED_PAGE_SIZE };

  return pagedPosts(
    postsListMyPostsInfiniteQueryKey({ query }),
    async ({ cursor, signal }) => {
      const { data } = await postsListMyPosts({
        query: { ...query, cursor },
        signal,
        throwOnError: true,
      });
      return data;
    }
  );
}
