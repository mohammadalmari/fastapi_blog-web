import type { PostSummary } from "@/api/generated/types.gen";
import { canOn } from "@/lib/permissions";

// What someone may do with a post, as the API's PostService decides it.
// These decide which buttons to show; the API decides what happens.

type Me = Parameters<typeof canOn>[0];
type Post = Pick<PostSummary, "status" | "author">;

const owner = (post: Post) => post.author?.id;

export function canPublishPost(me: Me, post: Post): boolean {
  return canOn(me, owner(post), {
    any: "posts:publish:any",
    own: "posts:publish:own",
  });
}

export function canEditPost(me: Me, post: Post): boolean {
  const mayUpdate = canOn(me, owner(post), {
    any: "posts:update:any",
    own: "posts:update:own",
  });
  // Editing what is already public is publishing the new text.
  return mayUpdate && (post.status === "draft" || canPublishPost(me, post));
}

export function canDeletePost(me: Me, post: Post): boolean {
  return canOn(me, owner(post), {
    any: "posts:delete:any",
    own: "posts:delete:own",
  });
}
