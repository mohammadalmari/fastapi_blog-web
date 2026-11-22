import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { postsListTagsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { TagList } from "@/features/posts/components/tag-list";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";

export const Route = createFileRoute("/tags")({
  // The loader starts the request as soon as the link is hovered or the
  // address is opened; the component then reads the same cache entry.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(postsListTagsOptions()),
  head: () => ({ meta: [{ title: `Tags, ${SITE_NAME}` }] }),
  component: TagsPage,
});

function TagsPage() {
  const { data: tags } = useSuspenseQuery(postsListTagsOptions());

  return (
    <MarginRow rail="Most used first">
      <h1 className="text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
        Tags
      </h1>
      <p className="mt-4 mb-8 max-w-[60ch] font-serif text-lg">
        What the published posts are about. The list can be a couple of minutes
        behind.
      </p>
      <TagList tags={tags} />
    </MarginRow>
  );
}
