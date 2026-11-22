import type { InfiniteData } from "@tanstack/react-query";

import type {
  CommentPublic,
  PageCommentPublic,
} from "@/api/generated/types.gen";

// Changes to the comments already fetched, so a new comment, an edit or a
// like shows at once instead of after fetching every page again. Each
// returns new data and leaves what it was given alone; each accepts
// "nothing fetched yet" and returns it unchanged.

// The page parameter is the cursor; nothing here reads it.
export type CommentPages = InfiniteData<PageCommentPublic, unknown>;

const mapItems = (
  data: CommentPages,
  change: (items: CommentPublic[]) => CommentPublic[]
): CommentPages => ({
  ...data,
  pages: data.pages.map((page) => ({ ...page, items: change(page.items) })),
});

/**
 * Every comment fetched, in order, each once.
 *
 * A comment just posted is added to the end of what is fetched, so its
 * writer sees it. If older comments were still to come, fetching them
 * brings it again, in its true place: the later copy is the one kept.
 */
export function flattenComments(data: CommentPages | undefined) {
  if (!data) return [];
  const all = data.pages.flatMap((page) => page.items);
  const last = new Map(all.map((comment, index) => [comment.id, index]));
  return all.filter((comment, index) => last.get(comment.id) === index);
}

/** Add a comment after the last one fetched. */
export function appendComment(
  data: CommentPages | undefined,
  comment: CommentPublic
): CommentPages | undefined {
  if (!data || data.pages.length === 0) return data;
  const pages = data.pages.slice();
  const end = pages[pages.length - 1];
  pages[pages.length - 1] = { ...end, items: [...end.items, comment] };
  return { ...data, pages };
}

/** Replace the comment with this id by `change(comment)`, wherever it is. */
export function patchComment(
  data: CommentPages | undefined,
  id: string,
  change: (comment: CommentPublic) => CommentPublic
): CommentPages | undefined {
  if (!data) return data;
  return mapItems(data, (items) =>
    items.map((comment) => (comment.id === id ? change(comment) : comment))
  );
}

/** Take the comment with this id out. */
export function removeComment(
  data: CommentPages | undefined,
  id: string
): CommentPages | undefined {
  if (!data) return data;
  return mapItems(data, (items) =>
    items.filter((comment) => comment.id !== id)
  );
}

/**
 * What a deleted comment that still has replies becomes: the API keeps it,
 * with its text and author erased, so the replies keep their place.
 */
export function asPlaceholder(comment: CommentPublic): CommentPublic {
  return {
    ...comment,
    is_deleted: true,
    content: null,
    author: null,
    like_count: 0,
    liked_by_me: false,
  };
}
