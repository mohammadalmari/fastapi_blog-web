import { Link } from "@tanstack/react-router";

import { MarginRow } from "@/components/layout/margin-row";

/**
 * One answer for a page that was never there, one that was deleted, and one
 * the reader may not see: the API makes no difference between them either.
 */
export function NotFoundPage() {
  return (
    <MarginRow rail="404">
      <h1 className="max-w-[20ch] text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
        Nothing is written here
      </h1>
      <p className="mt-4 max-w-[60ch] font-serif text-lg">
        The page may have been moved or deleted, or the address may be mistyped.
      </p>
      <p className="mt-6">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
        >
          Go to the posts
        </Link>
      </p>
    </MarginRow>
  );
}
