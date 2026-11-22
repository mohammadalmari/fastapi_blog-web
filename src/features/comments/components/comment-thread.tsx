import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";

import type { PostPublic } from "@/api/generated/types.gen";
import { describeError } from "@/features/auth/form-errors";
import { useMe, useSessionStatus } from "@/features/auth/hooks";
import { flattenComments } from "@/features/comments/cache";
import { CommentForm } from "@/features/comments/components/comment-form";
import {
  CommentBody,
  CommentByline,
} from "@/features/comments/components/comment-item";
import { commentActions } from "@/features/comments/mutations";
import { commentsOptions } from "@/features/comments/queries";
import { count } from "@/lib/format";
import { can } from "@/lib/permissions";

import { MarginRow } from "@/components/layout/margin-row";

import { Button } from "@/components/ui/button";

/**
 * The talk under a post: a box to add to it, then the comments, oldest
 * first, each with its replies a click away. As visible as the post is.
 */
export function CommentThread({ post }: { post: PostPublic }) {
  const queryClient = useQueryClient();
  const status = useSessionStatus();
  const me = useMe();
  const here = useLocation({ select: (location) => location.href });
  const {
    data,
    error,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery(commentsOptions(post.id));
  const comments = flattenComments(data);
  const actions = commentActions(queryClient, post);

  return (
    <section id="comments" aria-labelledby="comments-heading">
      <MarginRow
        rail={me ? <>Writing as {me.username}</> : null}
        railClassName="pt-9"
        contentClassName="pb-8"
      >
        <h2
          id="comments-heading"
          className="mb-4 text-3xl font-semibold tracking-tight"
        >
          {count(post.comment_count, "comment")}
        </h2>
        {post.status !== "published" ? (
          <p className="font-serif text-lg">
            Comments open when the post is published.
          </p>
        ) : status === "out" ? (
          <p className="font-serif text-lg">
            <Link
              to="/login"
              search={{ redirect: `${here.split("#")[0]}#comments` }}
              className="font-sans font-semibold text-primary underline underline-offset-4"
            >
              Log in
            </Link>{" "}
            to add a comment.
          </p>
        ) : can(me, "comments:create") ? (
          <CommentForm
            label="Add a comment"
            submitLabel="Post comment"
            busyLabel="Posting"
            onSubmit={async (content) => {
              await actions.create(content);
            }}
          />
        ) : null}
      </MarginRow>

      {isPending ? (
        <MarginRow>
          <p className="text-muted-foreground">Loading comments</p>
        </MarginRow>
      ) : null}

      {comments.map((comment) => (
        <article key={comment.id} aria-label="Comment">
          <MarginRow
            rail={<CommentByline comment={comment} />}
            railClassName="pt-5"
            contentClassName="py-4"
          >
            <CommentBody comment={comment} post={post} me={me} />
          </MarginRow>
        </article>
      ))}

      {error ? (
        <MarginRow>
          <p role="alert" className="text-destructive">
            The comments didn&apos;t load. {describeError(error)}
          </p>
          <Button
            variant="outline"
            size="lg"
            className="mt-3"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </MarginRow>
      ) : null}

      {hasNextPage ? (
        <MarginRow contentClassName="pb-12">
          <Button
            variant="outline"
            size="lg"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? "Loading comments" : "Load more comments"}
          </Button>
        </MarginRow>
      ) : null}
    </section>
  );
}
