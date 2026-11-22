import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { postsReadPostOptions } from "@/api/generated/@tanstack/react-query.gen";
import { orNotFound } from "@/api/not-found";
import { TagLink } from "@/features/posts/components/tag-link";
import { AuthorLink } from "@/features/users/components/author";
import { count, formatDate } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";
import { Markdown } from "@/components/markdown";

const postOptions = (slug: string) => postsReadPostOptions({ path: { slug } });

export const Route = createFileRoute("/posts/$slug")({
  loader: ({ context, params }) =>
    orNotFound(context.queryClient.ensureQueryData(postOptions(params.slug))),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title}, ${SITE_NAME}` : SITE_NAME },
    ],
  }),
  component: PostPage,
});

// An edit within a minute of publishing is the author fixing a typo, not
// news for the reader.
const EDIT_WORTH_SAYING_MS = 60_000;

function PostPage() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postOptions(slug));

  const isDraft = post.status === "draft";
  const date = post.published_at ?? post.created_at;
  const edited =
    !isDraft &&
    Date.parse(post.updated_at) - Date.parse(date) > EDIT_WORTH_SAYING_MS;

  return (
    <article>
      <MarginRow
        railClassName="flex flex-col items-start gap-4 pt-11 pb-6"
        contentClassName="pt-7 pb-14"
        rail={
          <>
            {isDraft ? (
              <span className="rounded-sm bg-highlight px-2.5 py-0.5 text-[15px] font-semibold text-highlight-foreground">
                Draft
              </span>
            ) : null}
            <div>
              <time
                dateTime={date}
                className="block font-semibold text-foreground"
              >
                {formatDate(date)}
              </time>
              {edited ? (
                <div>
                  Edited{" "}
                  <time dateTime={post.updated_at}>
                    {formatDate(post.updated_at)}
                  </time>
                </div>
              ) : null}
            </div>
            <AuthorLink
              author={post.author}
              withAvatar
              className="font-semibold text-foreground"
            />
            <div>
              <div>{count(post.like_count, "like")}</div>
              <div>{count(post.comment_count, "comment")}</div>
            </div>
            {post.tags.length > 0 ? (
              <ul aria-label="Tags" className="flex flex-col">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <TagLink tag={tag} className="min-h-8" />
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        }
      >
        <h1
          dir="auto"
          className="max-w-[17ch] text-[clamp(2.125rem,5.4vw,4rem)] leading-[1.02] font-extrabold tracking-[-0.035em] break-words"
        >
          {post.title}
        </h1>
        <Markdown className="mt-8">{post.content}</Markdown>
      </MarginRow>
    </article>
  );
}
