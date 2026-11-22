import { useState } from "react";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CommentPublic,
  PostPublic,
  UserMe,
} from "@/api/generated/types.gen";
import { describeError } from "@/features/auth/form-errors";
import { flattenComments } from "@/features/comments/cache";
import { CommentForm } from "@/features/comments/components/comment-form";
import { commentActions } from "@/features/comments/mutations";
import {
  canDeleteComment,
  canEditComment,
} from "@/features/comments/permissions";
import { repliesOptions } from "@/features/comments/queries";
import { LikeButton } from "@/features/likes/components/like-button";
import { useLikeComment } from "@/features/likes/use-like";
import { AuthorLink } from "@/features/users/components/author";
import { count, formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const action =
  "inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline";

type Mode = "read" | "edit" | "reply";

/** Who wrote a comment and when, for the rail or above a reply. */
export function CommentByline({ comment }: { comment: CommentPublic }) {
  const edited = comment.updated_at > comment.created_at;

  return (
    <>
      {comment.is_deleted ? null : (
        <AuthorLink
          author={comment.author}
          className="min-h-8 font-semibold text-foreground"
        />
      )}
      <time dateTime={comment.created_at} className="block">
        {formatDate(comment.created_at)}
      </time>
      {edited && !comment.is_deleted ? <span>Edited</span> : null}
    </>
  );
}

/**
 * A comment's text, its actions, and (for a comment on the post itself)
 * its replies. Replies can't be replied to: the API keeps one level.
 */
export function CommentBody({
  comment,
  post,
  me,
}: {
  comment: CommentPublic;
  post: PostPublic;
  me: UserMe | undefined;
}) {
  const queryClient = useQueryClient();
  const actions = commentActions(queryClient, post);
  const like = useLikeComment(comment);

  const [mode, setMode] = useState<Mode>("read");
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const isReply = comment.parent_id !== null;
  const mayReply =
    !isReply &&
    !comment.is_deleted &&
    post.status === "published" &&
    can(me, "comments:create");

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await actions.remove(comment);
    } catch (error) {
      setDeleteError(error);
    }
    setDeleting(false);
    setConfirmingDelete(false);
  };

  return (
    <>
      {comment.is_deleted ? (
        <p className="text-muted-foreground italic">
          This comment was deleted. Its replies are still here.
        </p>
      ) : mode === "edit" ? (
        <CommentForm
          label="Edit your comment"
          submitLabel="Save comment"
          busyLabel="Saving"
          initial={comment.content ?? ""}
          autoFocus
          onCancel={() => setMode("read")}
          onSubmit={async (content) => {
            await actions.update(comment, content);
            setMode("read");
          }}
        />
      ) : (
        <p
          dir="auto"
          className="max-w-[66ch] font-serif text-[17px] leading-relaxed break-words whitespace-pre-line"
        >
          {comment.content}
        </p>
      )}

      {comment.is_deleted || mode === "edit" ? null : (
        <div className="flex flex-wrap items-center gap-x-5 text-[15px]">
          <LikeButton
            variant="text"
            liked={comment.liked_by_me}
            likes={comment.like_count}
            // A visitor may try: the click takes them to log in.
            allowed={me === undefined || can(me, "likes:create")}
            onToggle={like.toggle}
            error={like.error}
          />
          {mayReply ? (
            <button
              type="button"
              className={action}
              aria-expanded={mode === "reply"}
              onClick={() => setMode(mode === "reply" ? "read" : "reply")}
            >
              Reply
            </button>
          ) : null}
          {canEditComment(me, comment) ? (
            <button
              type="button"
              className={action}
              onClick={() => setMode("edit")}
            >
              Edit
            </button>
          ) : null}
          {canDeleteComment(me, comment) ? (
            <button
              type="button"
              className={cn(action, "text-destructive")}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </button>
          ) : null}
        </div>
      )}
      {deleteError ? (
        <p role="alert" className="text-sm text-destructive">
          The comment wasn&apos;t deleted. {describeError(deleteError)}
        </p>
      ) : null}

      {mode === "reply" ? (
        <div className="mt-2 border-s-2 border-border ps-5">
          <CommentForm
            label="Your reply"
            submitLabel="Post reply"
            busyLabel="Posting"
            autoFocus
            onCancel={() => setMode("read")}
            onSubmit={async (content) => {
              await actions.reply(comment, content);
              setMode("read");
              setRepliesOpen(true);
            }}
          />
        </div>
      ) : null}

      {!isReply && comment.reply_count > 0 ? (
        repliesOpen ? (
          <Replies parent={comment} post={post} me={me} />
        ) : (
          <button
            type="button"
            className={`${action} text-[15px] underline`}
            onClick={() => setRepliesOpen(true)}
          >
            Show {count(comment.reply_count, "reply")}
          </button>
        )
      ) : null}

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              {comment.reply_count > 0
                ? "Its text and your name are removed. Its replies stay."
                : "It is removed for good."}{" "}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep comment</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                // The dialog stays until the API has answered.
                event.preventDefault();
                void remove();
              }}
            >
              {deleting ? "Deleting" : "Delete comment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Replies({
  parent,
  post,
  me,
}: {
  parent: CommentPublic;
  post: PostPublic;
  me: UserMe | undefined;
}) {
  const {
    data,
    error,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery(repliesOptions(parent.id));
  const replies = flattenComments(data);

  if (isPending) {
    return <p className="text-[15px] text-muted-foreground">Loading replies</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-4 border-s-2 border-border ps-5">
      {replies.map((reply) => (
        <article key={reply.id} aria-label="Reply">
          <div className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
            <CommentByline comment={reply} />
          </div>
          <CommentBody comment={reply} post={post} me={me} />
        </article>
      ))}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          The replies didn&apos;t load. {describeError(error)}{" "}
          <button
            type="button"
            className={action}
            onClick={() => void refetch()}
          >
            Try again
          </button>
        </p>
      ) : null}
      {hasNextPage ? (
        <button
          type="button"
          className={`${action} self-start text-[15px] underline`}
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? "Loading replies" : "Show more replies"}
        </button>
      ) : null}
    </div>
  );
}
