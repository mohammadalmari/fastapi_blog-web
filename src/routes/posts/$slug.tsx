import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { postsReadPostOptions } from "@/api/generated/@tanstack/react-query.gen";
import { orNotFound } from "@/api/not-found";
import { useMe } from "@/features/auth/hooks";
import { CommentThread } from "@/features/comments/components/comment-thread";
import { commentsOptions } from "@/features/comments/queries";
import { LikeButton } from "@/features/likes/components/like-button";
import { useLikePost } from "@/features/likes/use-like";
import { TagLink } from "@/features/posts/components/tag-link";
import { canEditPost } from "@/features/posts/permissions";
import { AuthorLink } from "@/features/users/components/author";
import { count, formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";
import { Markdown } from "@/components/markdown";

import { Badge } from "@/components/ui/badge";

const postOptions = (slug: string) => postsReadPostOptions({ path: { slug } });

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ context, params }) => {
    const post = await orNotFound(
      context.queryClient.ensureQueryData(postOptions(params.slug))
    );
    // Started, not awaited: the post is what the reader came for, and the
    // comments fill in below it.
    void context.queryClient.prefetchInfiniteQuery(commentsOptions(post.id));
    return post;
  },
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
  const me = useMe();
  const like = useLikePost(post);

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
            {isDraft ? <Badge variant="highlight">Draft</Badge> : null}
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
            <LikeButton
              liked={post.liked_by_me}
              likes={post.like_count}
              // A visitor may try: the click takes them to log in.
              allowed={me === undefined || can(me, "likes:create")}
              onToggle={like.toggle}
              error={like.error}
            />
            <a
              href="#comments"
              className="inline-flex min-h-8 items-center text-primary underline underline-offset-4"
            >
              {count(post.comment_count, "comment")}
            </a>
            {post.tags.length > 0 ? (
              <ul aria-label="Tags" className="flex flex-col">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <TagLink tag={tag} className="min-h-8" />
                  </li>
                ))}
              </ul>
            ) : null}
            {canEditPost(me, post) ? (
              <Link
                to="/posts/$slug/edit"
                params={{ slug: post.slug }}
                className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
              >
                Edit post
              </Link>
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
      <CommentThread post={post} />
    </article>
  );
}
