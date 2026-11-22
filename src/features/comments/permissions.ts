import type { CommentPublic } from "@/api/generated/types.gen";
import { can, canOn } from "@/lib/permissions";

// What someone may do with a comment, as the API's CommentService decides
// it. These decide which actions to show; the API decides what happens.

type Me = Parameters<typeof canOn>[0];

/** Only its writer edits a comment: nobody may put words in another's mouth. */
export function canEditComment(me: Me, comment: CommentPublic): boolean {
  return (
    !comment.is_deleted &&
    me != null &&
    comment.author?.id === me.id &&
    can(me, "comments:update:own")
  );
}

/** Its writer, or a moderator. */
export function canDeleteComment(me: Me, comment: CommentPublic): boolean {
  return (
    !comment.is_deleted &&
    canOn(me, comment.author?.id, {
      any: "comments:delete:any",
      own: "comments:delete:own",
    })
  );
}
