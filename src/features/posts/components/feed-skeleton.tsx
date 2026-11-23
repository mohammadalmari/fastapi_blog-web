import { useSearch } from "@tanstack/react-router";

import { TagFilter } from "@/features/posts/components/tag-filter";
import { cn } from "@/lib/utils";

import { MarginRow } from "@/components/layout/margin-row";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * One line of text that hasn't arrived. It takes the text's own classes, so
 * it is exactly one line of that text tall, and the page doesn't move when
 * the words replace it.
 */
function Line({ className, width }: { className?: string; width: string }) {
  return (
    <div className={cn("flex h-[1lh] items-center", className)}>
      <Skeleton className={cn("h-[0.7em]", width)} />
    </div>
  );
}

// The same rows, sizes and spacing as `PostListItem`; change them together.
function ItemOutline({ lead = false }: { lead?: boolean }) {
  return (
    <MarginRow
      railClassName={lead ? "pt-11" : undefined}
      contentClassName={lead ? "pt-7 pb-10" : undefined}
      rail={
        <>
          <Line className="font-semibold" width="w-24" />
          <div className="flex min-h-8 items-center">
            <Skeleton className="h-[0.7em] w-20" />
          </div>
        </>
      }
    >
      {lead ? (
        <div className="max-w-[17ch] text-[clamp(2.125rem,5.4vw,4rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
          <Line width="w-full" />
          <Line width="w-3/5" />
        </div>
      ) : (
        <Line className="max-w-[28ch] text-3xl leading-[1.15]" width="w-4/5" />
      )}
      <div
        className={cn(
          "max-w-[62ch] font-serif",
          lead
            ? "mt-5 text-xl leading-relaxed"
            : "mt-2.5 text-[17px] leading-relaxed"
        )}
      >
        <Line width="w-full" />
        <Line width={lead ? "w-full" : "w-2/3"} />
        {lead ? <Line width="w-1/2" /> : null}
      </div>
      <div className="mt-1 flex min-h-11 items-center gap-x-5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-20" />
      </div>
    </MarginRow>
  );
}

/**
 * The home page while its posts are on their way: the real tag row, which
 * needs nothing from the page, then the outline of the newest post, set
 * large, and a few after it.
 */
export function FeedSkeleton() {
  const { tag, author } = useSearch({
    strict: false,
    select: (search) => search as { tag?: string; author?: string },
  });

  return (
    <>
      <TagFilter active={tag} />
      {tag !== undefined || author !== undefined ? (
        // The "Posts tagged …" heading of a filtered feed.
        <MarginRow contentClassName="pb-2">
          <Line className="text-2xl" width="w-64 max-w-full" />
        </MarginRow>
      ) : null}
      <div role="status" aria-label="Loading posts">
        <ItemOutline lead />
        <ItemOutline />
        <ItemOutline />
        <ItemOutline />
      </div>
    </>
  );
}
