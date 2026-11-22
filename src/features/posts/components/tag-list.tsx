import type { TagCount } from "@/api/generated/types.gen";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

const posts = new Intl.PluralRules("en");

function postCount(count: number) {
  return `${count} ${posts.select(count) === "one" ? "post" : "posts"}`;
}

/** Tags in the order the API gives them: most used first. */
export function TagList({ tags }: { tags: TagCount[] }) {
  if (tags.length === 0) {
    return (
      <Empty className="items-start p-0 text-left">
        <EmptyHeader className="items-start text-left">
          <EmptyTitle>No tags yet</EmptyTitle>
          <EmptyDescription>
            A tag shows up here once a published post carries it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-8">
      {tags.map((tag) => (
        <li
          key={tag.name}
          className="flex min-h-11 items-baseline justify-between gap-4 border-b border-border py-2"
        >
          {/* Tags are written by users, in any script. */}
          <span
            dir="auto"
            className="min-w-0 text-lg font-semibold break-words"
          >
            {tag.name}
          </span>
          <span className="shrink-0 text-sm text-muted-foreground">
            {postCount(tag.count)}
          </span>
        </li>
      ))}
    </ul>
  );
}
