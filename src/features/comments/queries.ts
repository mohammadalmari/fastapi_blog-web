import type { QueryKey } from "@tanstack/react-query";
import { infiniteQueryOptions } from "@tanstack/react-query";

import {
  commentsListCommentsInfiniteQueryKey,
  commentsListRepliesInfiniteQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import {
  commentsListComments,
  commentsListReplies,
} from "@/api/generated/sdk.gen";
import type { PageCommentPublic } from "@/api/generated/types.gen";

type Page = { cursor: string | null; signal: AbortSignal };

// The same shape as the lists of posts (features/posts/queries.ts): a page
// at a time, oldest first, each starting where the last ended.
function pagedComments(
  queryKey: QueryKey,
  fetchPage: (page: Page) => Promise<PageCommentPublic>
) {
  return infiniteQueryOptions({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      fetchPage({ cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });
}

/** The comments on a post itself, each with its number of replies. */
export function commentsOptions(postId: string) {
  const path = { post_id: postId };

  return pagedComments(
    commentsListCommentsInfiniteQueryKey({ path }),
    async ({ cursor, signal }) => {
      const { data } = await commentsListComments({
        path,
        query: { cursor },
        signal,
        throwOnError: true,
      });
      return data;
    }
  );
}

/** The replies to one comment. Fetched when a reader asks to see them. */
export function repliesOptions(commentId: string) {
  const path = { comment_id: commentId };

  return pagedComments(
    commentsListRepliesInfiniteQueryKey({ path }),
    async ({ cursor, signal }) => {
      const { data } = await commentsListReplies({
        path,
        query: { cursor },
        signal,
        throwOnError: true,
      });
      return data;
    }
  );
}

const COMMENT_LISTS = new Set(["commentsListComments", "commentsListReplies"]);
const POST_LISTS = new Set(["postsListPosts", "postsListMyPosts"]);

const idOf = (queryKey: QueryKey) =>
  (queryKey[0] as { _id?: string } | undefined)?._id ?? "";

/** Whether a cached query is a list of comments or replies, of any post. */
export const isCommentList = (queryKey: QueryKey) =>
  COMMENT_LISTS.has(idOf(queryKey));

/** Whether a cached query is a list of posts, which shows their counts. */
export const isPostList = (queryKey: QueryKey) =>
  POST_LISTS.has(idOf(queryKey));
