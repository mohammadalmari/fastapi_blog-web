import type { QueryClient } from "@tanstack/react-query";

import { postsReadPostQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import {
  postsCreatePost,
  postsDeletePost,
  postsPublishPost,
  postsUnpublishPost,
  postsUpdatePost,
} from "@/api/generated/sdk.gen";
import type {
  PostCreate,
  PostPublic,
  PostUpdate,
} from "@/api/generated/types.gen";

// Everything that changes a post. Each returns the post as the API now has
// it and puts it in the cache, then marks every list stale: a post's
// title, tags or status can appear in the feed, a profile, "my posts" and
// the tag counts, and working out which would cost more than asking again.

function remember(queryClient: QueryClient, post: PostPublic) {
  queryClient.setQueryData(
    postsReadPostQueryKey({ path: { slug: post.slug } }),
    post
  );
  void queryClient.invalidateQueries();
  return post;
}

export function postActions(queryClient: QueryClient) {
  return {
    async create(body: PostCreate) {
      const { data } = await postsCreatePost({ body, throwOnError: true });
      return remember(queryClient, data);
    },

    async update(post: PostPublic, body: PostUpdate) {
      // Nothing changed: there is nothing to ask the API for.
      if (Object.keys(body).length === 0) return post;
      const { data } = await postsUpdatePost({
        path: { post_id: post.id },
        body,
        throwOnError: true,
      });
      return remember(queryClient, data);
    },

    async publish(post: PostPublic) {
      const { data } = await postsPublishPost({
        path: { post_id: post.id },
        throwOnError: true,
      });
      return remember(queryClient, data);
    },

    async unpublish(post: PostPublic) {
      const { data } = await postsUnpublishPost({
        path: { post_id: post.id },
        throwOnError: true,
      });
      return remember(queryClient, data);
    },

    async remove(post: PostPublic) {
      await postsDeletePost({ path: { post_id: post.id }, throwOnError: true });
      queryClient.removeQueries({
        queryKey: postsReadPostQueryKey({ path: { slug: post.slug } }),
      });
      void queryClient.invalidateQueries();
    },
  };
}
