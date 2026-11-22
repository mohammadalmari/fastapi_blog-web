import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postsReadPostQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import {
  likesLikeComment,
  likesLikePost,
  likesUnlikeComment,
  likesUnlikePost,
} from "@/api/generated/sdk.gen";
import type { CommentPublic, PostPublic } from "@/api/generated/types.gen";
import { useRequireLogin } from "@/features/auth/use-require-login";
import type { CommentPages } from "@/features/comments/cache";
import { patchComment } from "@/features/comments/cache";
import { isCommentList, isPostList } from "@/features/comments/queries";
import type { Likeable } from "@/features/likes/like";
import { withLike } from "@/features/likes/like";

// A like shows the moment it is clicked and is taken back if the API
// refuses it. The request states the result (PUT to like, DELETE to take
// it back), never "toggle", so sending one twice ends where once does.

type Optimistic<Snapshot> = {
  /** Show the thing as liked or not, and return how to undo that. */
  show: (liked: boolean) => Promise<Snapshot> | Snapshot;
  undo: (snapshot: Snapshot) => void;
  send: (liked: boolean) => Promise<unknown>;
  /** After the API has answered, either way. */
  settled?: () => void;
};

function useLike<Snapshot>(thing: Likeable, optimistic: Optimistic<Snapshot>) {
  const requireLogin = useRequireLogin();
  const mutation = useMutation({
    mutationFn: optimistic.send,
    onMutate: optimistic.show,
    onError: (_error, _liked, snapshot) => {
      if (snapshot !== undefined) optimistic.undo(snapshot);
    },
    onSettled: optimistic.settled,
  });

  return {
    toggle() {
      if (!requireLogin()) return;
      // One request at a time: a second click waits for the first answer,
      // or the two could arrive in the other order.
      if (mutation.isPending) return;
      mutation.mutate(!thing.liked_by_me);
    },
    error: mutation.error,
  };
}

export function useLikePost(post: PostPublic) {
  const queryClient = useQueryClient();
  const key = postsReadPostQueryKey({ path: { slug: post.slug } });
  const path = { post_id: post.id };

  return useLike(post, {
    send: (liked) =>
      liked
        ? likesLikePost({ path, throwOnError: true })
        : likesUnlikePost({ path, throwOnError: true }),
    show: async (liked) => {
      // A fetch already on its way would put the old count back.
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<PostPublic>(key);
      queryClient.setQueryData<PostPublic>(
        key,
        (cached) => cached && withLike(cached, liked)
      );
      return before;
    },
    undo: (before) => queryClient.setQueryData(key, before),
    // Lists of posts show the count too; they ask again when next shown.
    settled: () =>
      void queryClient.invalidateQueries({
        predicate: (query) => isPostList(query.queryKey),
        refetchType: "none",
      }),
  });
}

export function useLikeComment(comment: CommentPublic) {
  const queryClient = useQueryClient();
  const path = { comment_id: comment.id };
  const lists = { predicate: isCommentListQuery };

  return useLike(comment, {
    send: (liked) =>
      liked
        ? likesLikeComment({ path, throwOnError: true })
        : likesUnlikeComment({ path, throwOnError: true }),
    show: async (liked) => {
      await queryClient.cancelQueries(lists);
      const before = queryClient.getQueriesData<CommentPages>(lists);
      queryClient.setQueriesData<CommentPages>(lists, (cached) =>
        patchComment(cached, comment.id, (found) => withLike(found, liked))
      );
      return before;
    },
    undo: (before) => {
      for (const [key, data] of before) queryClient.setQueryData(key, data);
    },
  });
}

function isCommentListQuery(query: { queryKey: readonly unknown[] }) {
  return isCommentList(query.queryKey);
}
