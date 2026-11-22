import { createFileRoute, Link } from "@tanstack/react-router";

import { MarginRow } from "@/components/layout/margin-row";

export const Route = createFileRoute("/")({
  component: HomePage,
});

// The feed of posts is built in the next stage of the plan; until then this
// page says so and points at what can be read.
function HomePage() {
  return (
    <MarginRow rail="Posts">
      <h1 className="max-w-[17ch] text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
        The posts aren&apos;t listed here yet
      </h1>
      <p className="mt-5 max-w-[60ch] font-serif text-lg">
        This page will show what has been published, newest first. The tags
        already in use are ready to look through.
      </p>
      <p className="mt-6">
        <Link
          to="/tags"
          className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
        >
          See the tags
        </Link>
      </p>
    </MarginRow>
  );
}
