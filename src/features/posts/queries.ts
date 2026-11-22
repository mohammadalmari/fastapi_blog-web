import { z } from "zod";

import {
  postsListMyPostsInfiniteQueryKey,
  postsListPostsInfiniteQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { postsListMyPosts, postsListPosts } from "@/api/generated/sdk.gen";
import type { PagePostSummary } from "@/api/generated/types.gen";
import { pagedOptions } from "@/api/paging";

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

/** Every list of posts takes these options, whichever list it is. */
export type PostListOptions = ReturnType<typeof pagedOptions<PagePostSummary>>;

/** Published posts, newest first. */
export function feedOptions(filters: FeedFilters = {}): PostListOptions {
  const query = { ...filters, limit: FEED_PAGE_SIZE };

  return pagedOptions<PagePostSummary>(
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

  return pagedOptions<PagePostSummary>(
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
