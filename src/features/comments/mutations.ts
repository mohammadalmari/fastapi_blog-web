import type { QueryClient } from "@tanstack/react-query";

import { postsReadPostQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import {
  commentsCreateComment,
  commentsCreateReply,
  commentsDeleteComment,
  commentsUpdateComment,
} from "@/api/generated/sdk.gen";
import type { CommentPublic, PostPublic } from "@/api/generated/types.gen";
import type { CommentPages } from "@/features/comments/cache";
import {
  appendComment,
  asPlaceholder,
  patchComment,
  removeComment,
} from "@/features/comments/cache";
import {
  commentsOptions,
  isCommentList,
  isPostList,
  repliesOptions,
} from "@/features/comments/queries";

/**
 * Everything that changes the comments under `post`. Each shows its result
 * at once by changing what is already fetched, then lets the lists that
 * carry counts know they are out of date.
 */
export function commentActions(queryClient: QueryClient, post: PostPublic) {
  const postKey = postsReadPostQueryKey({ path: { slug: post.slug } });

  const everyList = (
    change: (data: CommentPages | undefined) => CommentPages | undefined
  ) =>
    queryClient.setQueriesData<CommentPages>(
      { predicate: (query) => isCommentList(query.queryKey) },
      change
    );

  const countOnPost = (by: number) => {
    queryClient.setQueryData<PostPublic>(
      postKey,
      (cached) =>
        cached && {
          ...cached,
          comment_count: Math.max(0, cached.comment_count + by),
        }
    );
    // The feed shows the count too; it asks again when next looked at.
    void queryClient.invalidateQueries({
      predicate: (query) => isPostList(query.queryKey),
      refetchType: "none",
    });
  };

  return {
    async create(content: string) {
      const { data } = await commentsCreateComment({
        path: { post_id: post.id },
        body: { content },
        throwOnError: true,
      });
      queryClient.setQueryData(commentsOptions(post.id).queryKey, (cached) =>
        appendComment(cached, data)
      );
      countOnPost(1);
      return data;
    },

    async reply(parent: CommentPublic, content: string) {
      const { data } = await commentsCreateReply({
        path: { comment_id: parent.id },
        body: { content },
        throwOnError: true,
      });
      queryClient.setQueryData(repliesOptions(parent.id).queryKey, (cached) =>
        appendComment(cached, data)
      );
      everyList((cached) =>
        patchComment(cached, parent.id, (comment) => ({
          ...comment,
          reply_count: comment.reply_count + 1,
        }))
      );
      countOnPost(1);
      return data;
    },

    async update(comment: CommentPublic, content: string) {
      const { data } = await commentsUpdateComment({
        path: { comment_id: comment.id },
        body: { content },
        throwOnError: true,
      });
      everyList((cached) => patchComment(cached, comment.id, () => data));
      return data;
    },

    async remove(comment: CommentPublic) {
      await commentsDeleteComment({
        path: { comment_id: comment.id },
        throwOnError: true,
      });
      // With replies it stays as a placeholder; without, it is gone.
      everyList((cached) =>
        comment.reply_count > 0
          ? patchComment(cached, comment.id, asPlaceholder)
          : removeComment(cached, comment.id)
      );
      // The API settles the rest: the post's count, the parent's count, and
      // a placeholder that goes with its last reply.
      void queryClient.invalidateQueries({ queryKey: postKey });
      void queryClient.invalidateQueries({
        predicate: (query) => isCommentList(query.queryKey),
      });
      countOnPost(0);
    },
  };
}
