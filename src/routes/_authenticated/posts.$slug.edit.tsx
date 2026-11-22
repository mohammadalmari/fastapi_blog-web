import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  postsReadPostOptions,
  usersReadMeOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { orNotFound } from "@/api/not-found";
import { PostEditor } from "@/features/posts/components/post-editor";
import { canEditPost } from "@/features/posts/permissions";
import { SITE_NAME } from "@/lib/site";

const postOptions = (slug: string) => postsReadPostOptions({ path: { slug } });

export const Route = createFileRoute("/_authenticated/posts/$slug/edit")({
  loader: async ({ context, params }) => {
    const [post, me] = await Promise.all([
      orNotFound(context.queryClient.ensureQueryData(postOptions(params.slug))),
      context.queryClient.ensureQueryData(usersReadMeOptions()),
    ]);
    // There is no editing page for someone who may not edit: the same
    // "not found" as for a post they may not see.
    if (!canEditPost(me, post)) throw notFound();
    return post;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Editing ${loaderData.title}, ${SITE_NAME}`
          : SITE_NAME,
      },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postOptions(slug));
  const { data: me } = useSuspenseQuery(usersReadMeOptions());

  return (
    <>
      <h1 className="sr-only">Edit post</h1>
      {/* A different post is a different form, not this one with new text. */}
      <PostEditor key={post.id} post={post} me={me} />
    </>
  );
}
