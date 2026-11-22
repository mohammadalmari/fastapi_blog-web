import { z } from "zod";
import { infiniteQueryOptions } from "@tanstack/react-query";

import { postsListPostsInfiniteQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import { postsListPosts } from "@/api/generated/sdk.gen";

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

/**
 * The feed, a page at a time, each page starting where the last ended.
 *
 * Written out, where other queries use the generated options: the generated
 * infinite options leave the cursor's handling to the caller anyway, and
 * their types don't fit `useSuspenseInfiniteQuery`.
 */
export function feedOptions(filters: FeedFilters = {}) {
  const query = { ...filters, limit: FEED_PAGE_SIZE };

  return infiniteQueryOptions({
    queryKey: postsListPostsInfiniteQueryKey({ query }),
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await postsListPosts({
        query: { ...query, cursor: pageParam },
        signal,
        throwOnError: true,
      });
      return data;
    },
    initialPageParam: null as string | null,
    // A cursor belongs to the list and filters that issued it; null ends it.
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });
}
