import { MarginRow } from "@/components/layout/margin-row";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while a page's data is on its way, once the wait is long enough to
 * notice. The outline of a page, so the margin line doesn't jump.
 */
export function PendingPage() {
  return (
    <div role="status" aria-label="Loading">
      <MarginRow
        rail={
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-4/5 max-w-xl" />
          <Skeleton className="h-12 w-3/5 max-w-md" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="h-5 w-2/3 max-w-lg" />
        </div>
      </MarginRow>
    </div>
  );
}
