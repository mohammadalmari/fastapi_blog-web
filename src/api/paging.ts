import type { QueryKey } from "@tanstack/react-query";
import { infiniteQueryOptions } from "@tanstack/react-query";

/** What every paged list from the API answers: some items, and where next. */
export type CursorPage = { next_cursor: string | null };

export type PageRequest = { cursor: string | null; signal: AbortSignal };

/**
 * A list from the API, a page at a time, each page starting where the last
 * ended. `fetchPage` asks for one page; the cursor is the API's and is
 * passed on untouched.
 *
 * Written out, where single things use the generated options: the
 * generated infinite options leave the cursor's handling to the caller
 * anyway, and their types don't fit `useSuspenseInfiniteQuery`.
 */
export function pagedOptions<Page extends CursorPage>(
  queryKey: QueryKey,
  fetchPage: (request: PageRequest) => Promise<Page>
) {
  return infiniteQueryOptions({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      fetchPage({ cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    // A cursor belongs to the list and filters that issued it; null ends it.
    getNextPageParam: (lastPage: Page) => lastPage.next_cursor,
  });
}
