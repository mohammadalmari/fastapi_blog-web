import { Link } from "@tanstack/react-router";

import type { PostSummary } from "@/api/generated/types.gen";
import { useMe } from "@/features/auth/hooks";
import { TagLink } from "@/features/posts/components/tag-link";
import { canEditPost } from "@/features/posts/permissions";
import { AuthorLink } from "@/features/users/components/author";
import { count, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { MarginRow } from "@/components/layout/margin-row";

import { Badge } from "@/components/ui/badge";

/**
 * One post in a list: when and by whom in the rail, what it says beside it.
 * The first post of the feed is set larger (`lead`). `FeedSkeleton` copies
 * its sizes and spacing for the outline shown while the feed loads.
 */
export function PostListItem({
  post,
  lead = false,
  own = false,
}: {
  post: PostSummary;
  lead?: boolean;
  /** In a list of the reader's own posts: mark drafts, offer to edit. */
  own?: boolean;
}) {
  // A draft has no publication date; it only appears in its author's lists.
  const date = post.published_at ?? post.created_at;

  return (
    <article>
      <MarginRow
        railClassName={lead ? "pt-11" : undefined}
        contentClassName={lead ? "pt-7 pb-10" : undefined}
        rail={
          <>
            {own && post.status === "draft" ? (
              <Badge variant="highlight" className="mb-1.5">
                Draft
              </Badge>
            ) : null}
            <time
              dateTime={date}
              className="block font-semibold text-foreground"
            >
              {formatDate(date)}
            </time>
            <AuthorLink author={post.author} className="min-h-8" />
          </>
        }
      >
        <h2
          dir="auto"
          className={cn(
            // In a list everything hangs from the margin line, so a
            // right-to-left title keeps its word order but not its side.
            "text-left font-semibold break-words",
            lead
              ? "max-w-[17ch] text-[clamp(2.125rem,5.4vw,4rem)] leading-[1.02] font-extrabold tracking-[-0.035em]"
              : "max-w-[28ch] text-3xl leading-[1.15] tracking-tight"
          )}
        >
          <Link
            to="/posts/$slug"
            params={{ slug: post.slug }}
            className="decoration-primary decoration-2 underline-offset-4 hover:underline"
          >
            {post.title}
          </Link>
        </h2>
        {post.excerpt ? (
          <p
            dir="auto"
            className={cn(
              "max-w-[62ch] text-left font-serif break-words",
              lead
                ? "mt-5 text-xl leading-relaxed"
                : "mt-2.5 text-[17px] leading-relaxed"
            )}
          >
            {post.excerpt}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-5 text-[15px]">
          {post.tags.map((tag) => (
            <TagLink key={tag} tag={tag} />
          ))}
          <span className="text-muted-foreground">
            {count(post.like_count, "like")}
          </span>
          <span className="text-muted-foreground">
            {count(post.comment_count, "comment")}
          </span>
          {own ? <EditLink post={post} /> : null}
        </div>
      </MarginRow>
    </article>
  );
}

// Its own component so that only a list of the reader's own posts asks who
// the reader is.
function EditLink({ post }: { post: PostSummary }) {
  const me = useMe();
  if (!canEditPost(me, post)) return null;

  return (
    <Link
      to="/posts/$slug/edit"
      params={{ slug: post.slug }}
      className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
    >
      Edit
    </Link>
  );
}
