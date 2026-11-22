import { useDeferredValue, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";

import type { PostPublic, UserMe } from "@/api/generated/types.gen";
import { showErrorOnForm } from "@/features/auth/form-errors";
import { TagInput } from "@/features/posts/components/tag-input";
import { postActions } from "@/features/posts/mutations";
import { canDeletePost, canPublishPost } from "@/features/posts/permissions";
import type { PostFormValues } from "@/features/posts/post-form";
import {
  EMPTY_POST,
  postFormSchema,
  toCreate,
  toUpdate,
  valuesOf,
} from "@/features/posts/post-form";
import { formatDate } from "@/lib/format";

import { MarginRow } from "@/components/layout/margin-row";
import { Markdown } from "@/components/markdown";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const FIELDS = ["title", "content", "excerpt", "tags"] as const;
const clock = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" });

type View = "write" | "split" | "preview";
type Busy = "save" | "publish" | "unpublish" | "delete" | null;

/**
 * Write a new post, or edit `post`. The rail holds what the post is (a
 * draft, published) and what can be done with it; the form holds the post.
 *
 * Which buttons appear follows the permissions the API will check: see
 * features/posts/permissions.ts.
 */
export function PostEditor({ post, me }: { post?: PostPublic; me: UserMe }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const actions = postActions(queryClient);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: post ? valuesOf(post) : EMPTY_POST,
  });
  const { errors, isDirty } = form.formState;

  const [busy, setBusy] = useState<Busy>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [view, setView] = useState<View>("split");
  // Typing stays quick in a long post: the preview catches up after.
  const preview = useDeferredValue(
    useWatch({ control: form.control, name: "content" })
  );

  // Asked only of navigation the writer starts. Where this page moves on by
  // itself after a save, it passes `ignoreBlocker`: those changes are saved.
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: () => isDirty,
    withResolver: true,
  });

  const isPublished = post?.status === "published";
  // A new post is the writer's own.
  const subject = post ?? { status: "draft" as const, author: me };
  const mayPublish = canPublishPost(me, subject);
  const mayDelete = post !== undefined && canDeletePost(me, post);

  const fail = (error: unknown) =>
    showErrorOnForm(error, form.setError, FIELDS);

  const save = (intent: "save" | "publish") =>
    form.handleSubmit(async (values) => {
      setBusy(intent);
      let current = post;
      try {
        current = post
          ? await actions.update(
              post,
              toUpdate(values, form.formState.dirtyFields)
            )
          : await actions.create(toCreate(values));
        if (intent === "publish") current = await actions.publish(current);
      } catch (error) {
        fail(error);
      }
      setBusy(null);
      if (!current) return;

      if (current.status === "published" && intent === "publish") {
        await navigate({
          to: "/posts/$slug",
          params: { slug: current.slug },
          ignoreBlocker: true,
        });
      } else if (!post) {
        // Saved as a draft, even if publishing it then failed: carry on
        // from its own page, or saving again would make a second post.
        await navigate({
          to: "/posts/$slug/edit",
          params: { slug: current.slug },
          replace: true,
          ignoreBlocker: true,
        });
      } else if (current !== post) {
        form.reset(valuesOf(current));
        setSavedAt(clock.format(new Date()));
      }
    });

  const unpublish = async () => {
    if (!post) return;
    setBusy("unpublish");
    try {
      await actions.unpublish(post);
    } catch (error) {
      fail(error);
    }
    setBusy(null);
  };

  const remove = async () => {
    if (!post) return;
    setBusy("delete");
    try {
      await actions.remove(post);
      await navigate({ to: "/me/posts", ignoreBlocker: true });
    } catch (error) {
      setConfirmingDelete(false);
      fail(error);
    }
    setBusy(null);
  };

  return (
    <form onSubmit={save("save")} noValidate>
      <MarginRow
        railClassName="flex flex-col items-start gap-3.5 pt-10 pb-6"
        contentClassName="pt-7 pb-16"
        rail={
          <>
            <Badge variant={isPublished ? "secondary" : "highlight"}>
              {isPublished ? "Published" : "Draft"}
            </Badge>
            <p>
              {!post
                ? "Not saved yet."
                : isPublished && post.published_at
                  ? `Public since ${formatDate(post.published_at)}.`
                  : "Only you and the people who manage posts can see it."}
            </p>
            {savedAt && !isDirty ? (
              <p role="status" className="font-semibold text-foreground">
                Saved at {savedAt}.
              </p>
            ) : null}

            {isPublished ? (
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={busy !== null}
              >
                {busy === "save" ? "Saving" : "Save changes"}
              </Button>
            ) : (
              <>
                {mayPublish ? (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={busy !== null}
                    onClick={save("publish")}
                  >
                    {busy === "publish" ? "Publishing" : "Publish"}
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  variant={mayPublish ? "outline" : "default"}
                  className="w-full"
                  disabled={busy !== null}
                >
                  {busy === "save" ? "Saving" : "Save draft"}
                </Button>
              </>
            )}

            {isPublished && mayPublish ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
                disabled={busy !== null}
                onClick={unpublish}
              >
                {busy === "unpublish" ? "Unpublishing" : "Unpublish"}
              </Button>
            ) : null}

            {post ? (
              <Link
                to="/posts/$slug"
                params={{ slug: post.slug }}
                className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
              >
                {isPublished ? "View post" : "View as a reader"}
              </Link>
            ) : null}

            {mayDelete ? (
              <Button
                type="button"
                variant="link"
                className="h-11 px-0 text-destructive"
                disabled={busy !== null}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete post
              </Button>
            ) : null}
          </>
        }
      >
        <FieldGroup>
          {errors.root ? (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor="post-title">Title</FieldLabel>
            <Textarea
              id="post-title"
              rows={1}
              dir="auto"
              aria-invalid={errors.title ? true : undefined}
              // The title is set as it will be read: large, on the page.
              className="min-h-0 resize-none rounded-none border-0 border-b-2 bg-transparent px-0 py-2 text-[clamp(1.875rem,4.4vw,3.25rem)] leading-[1.05] font-extrabold tracking-[-0.03em] shadow-none focus-visible:border-primary focus-visible:ring-0 md:text-[clamp(1.875rem,4.4vw,3.25rem)] dark:bg-transparent"
              {...form.register("title")}
            />
            <FieldError errors={[errors.title]} />
          </Field>

          <div className="grid gap-x-8 gap-y-7 md:grid-cols-2">
            <Field data-invalid={errors.tags ? true : undefined}>
              <FieldLabel htmlFor="post-tags">Tags</FieldLabel>
              <Controller
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <TagInput
                    id="post-tags"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={errors.tags !== undefined}
                  />
                )}
              />
              <FieldError
                errors={
                  Array.isArray(errors.tags) ? errors.tags : [errors.tags]
                }
              />
            </Field>

            <Field data-invalid={errors.excerpt ? true : undefined}>
              <FieldLabel htmlFor="post-excerpt">Summary</FieldLabel>
              <Textarea
                id="post-excerpt"
                rows={2}
                dir="auto"
                className="font-serif"
                aria-invalid={errors.excerpt ? true : undefined}
                aria-describedby="post-excerpt-hint"
                {...form.register("excerpt")}
              />
              <FieldDescription id="post-excerpt-hint">
                Shown in lists of posts. Leave it empty and it is written from
                the post&apos;s first lines.
              </FieldDescription>
              <FieldError errors={[errors.excerpt]} />
            </Field>
          </div>

          <Field data-invalid={errors.content ? true : undefined}>
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <FieldLabel htmlFor="post-content">Post, in Markdown</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                aria-label="Editor view"
                value={view}
                // Clicking the chosen view again would choose none.
                onValueChange={(next) => next && setView(next as View)}
              >
                <ToggleGroupItem value="write">Write</ToggleGroupItem>
                <ToggleGroupItem value="split">Side by side</ToggleGroupItem>
                <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div
              className={
                view === "split" ? "grid gap-6 lg:grid-cols-2" : undefined
              }
            >
              <Textarea
                id="post-content"
                dir="auto"
                // Kept in the page while hidden, so its text and the
                // browser's undo history survive a look at the preview.
                hidden={view === "preview"}
                aria-invalid={errors.content ? true : undefined}
                className="min-h-[28rem] font-mono text-[15px] leading-relaxed md:text-[15px]"
                {...form.register("content")}
              />
              {view !== "write" ? (
                <section aria-label="Preview" className="min-w-0">
                  {preview.trim() ? (
                    <Markdown className="text-[17px]">{preview}</Markdown>
                  ) : (
                    <p className="text-muted-foreground">
                      What you write appears here as readers will see it.
                    </p>
                  )}
                </section>
              ) : null}
            </div>
            <FieldError errors={[errors.content]} />
          </Field>
        </FieldGroup>
      </MarginRow>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              The post, its comments and its likes are removed for good. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep post</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy === "delete"}
              onClick={(event) => {
                // The dialog stays until the API has answered.
                event.preventDefault();
                void remove();
              }}
            >
              {busy === "delete" ? "Deleting" : "Delete post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              What you changed since the last save will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep writing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => blocker.proceed?.()}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
