import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { postsListTagsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { TagLink } from "@/features/posts/components/tag-link";
import { cn } from "@/lib/utils";

import { MarginRow } from "@/components/layout/margin-row";

// Enough to choose from without pushing the posts down the page; the rest
// are on /tags.
const SHOWN = 7;

const item = "inline-flex min-h-11 items-center underline-offset-4";

/** The most used tags, across the top of the feed. */
export function TagFilter({ active }: { active: string | undefined }) {
  // Not awaited by the page: the posts matter more, and without tags the
  // row simply holds its two fixed links.
  const { data: tags = [] } = useQuery(postsListTagsOptions());

  return (
    <MarginRow
      rail="Filter by tag"
      railClassName="pt-6"
      contentClassName="flex flex-wrap gap-x-5 py-3"
    >
      <Link
        to="/"
        className={cn(
          item,
          active ? "text-primary hover:underline" : "font-semibold"
        )}
        aria-current={active ? undefined : "true"}
      >
        All posts
      </Link>
      {tags.slice(0, SHOWN).map((tag) => (
        <TagLink
          key={tag.name}
          tag={tag.name}
          className={
            tag.name === active
              ? "font-semibold text-foreground underline decoration-primary decoration-2"
              : undefined
          }
        >
          <span className="text-muted-foreground">{tag.count}</span>
        </TagLink>
      ))}
      <Link to="/tags" className={cn(item, "text-muted-foreground underline")}>
        Every tag
      </Link>
    </MarginRow>
  );
}
