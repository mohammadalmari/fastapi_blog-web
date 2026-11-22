import { createFileRoute, Link } from "@tanstack/react-router";

import { usersReadMeOptions } from "@/api/generated/@tanstack/react-query.gen";
import { PostFeed } from "@/features/posts/components/post-feed";
import { myPostsOptions, myPostsSearchSchema } from "@/features/posts/queries";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

import { MarginRow } from "@/components/layout/margin-row";

export const Route = createFileRoute("/_authenticated/me/posts")({
  validateSearch: myPostsSearchSchema,
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureInfiniteQueryData(myPostsOptions(deps)),
      // The list shows "Edit" by what this account may do.
      context.queryClient.ensureQueryData(usersReadMeOptions()),
    ]),
  head: () => ({ meta: [{ title: `Your posts, ${SITE_NAME}` }] }),
  component: MyPostsPage,
});

const FILTERS = [
  { status: undefined, label: "All" },
  { status: "draft", label: "Drafts" },
  { status: "published", label: "Published" },
] as const;

function MyPostsPage() {
  const { status } = Route.useSearch();

  return (
    <>
      <MarginRow
        rail={
          <Link
            to="/write"
            className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            Write a post
          </Link>
        }
        contentClassName="pb-2"
      >
        <h1 className="text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
          Your posts
        </h1>
        <nav aria-label="Show" className="mt-5 flex flex-wrap gap-x-6">
          {FILTERS.map((filter) => (
            <Link
              key={filter.label}
              to="/me/posts"
              search={{ status: filter.status }}
              aria-current={filter.status === status ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center underline-offset-[6px]",
                filter.status === status
                  ? "font-semibold underline decoration-primary decoration-2"
                  : "text-primary hover:underline"
              )}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      </MarginRow>
      <PostFeed
        options={myPostsOptions({ status })}
        own
        empty={
          <p className="font-serif text-lg">
            {status === "draft"
              ? "No drafts."
              : status === "published"
                ? "Nothing published yet."
                : "You haven't written anything yet."}
          </p>
        }
      />
    </>
  );
}
