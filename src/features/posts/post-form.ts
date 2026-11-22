import { z } from "zod";

import type {
  PostCreate,
  PostPublic,
  PostUpdate,
} from "@/api/generated/types.gen";
import { MAX_TAGS, tagProblem } from "@/features/posts/tags";
import { hasHiddenCharacters } from "@/lib/text";

// The API's limits (app/posts/schemas.py). Checked here so the form can say
// so before sending; the API checks again.
export const TITLE_MAX_LENGTH = 200;
export const CONTENT_MAX_LENGTH = 100_000;
export const EXCERPT_MAX_LENGTH = 300;

const HIDDEN =
  "Remove the invisible characters, which often come along with pasted text.";

export const postFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the post a title.")
    .max(TITLE_MAX_LENGTH, `Use at most ${TITLE_MAX_LENGTH} characters.`)
    .refine((title) => !hasHiddenCharacters(title), HIDDEN),
  content: z
    .string()
    .min(1, "Write something first.")
    .max(
      CONTENT_MAX_LENGTH,
      `A post holds at most ${CONTENT_MAX_LENGTH.toLocaleString("en")} characters.`
    ),
  excerpt: z
    .string()
    .trim()
    .max(EXCERPT_MAX_LENGTH, `Use at most ${EXCERPT_MAX_LENGTH} characters.`)
    .refine((excerpt) => !hasHiddenCharacters(excerpt), HIDDEN),
  tags: z
    .array(z.string())
    .max(MAX_TAGS, `A post carries at most ${MAX_TAGS} tags.`)
    .superRefine((tags, context) => {
      for (const tag of tags) {
        const problem = tagProblem(tag);
        if (problem) context.addIssue({ code: "custom", message: problem });
      }
    }),
});

export type PostFormValues = z.infer<typeof postFormSchema>;

export const EMPTY_POST: PostFormValues = {
  title: "",
  content: "",
  excerpt: "",
  tags: [],
};

export function valuesOf(post: PostPublic): PostFormValues {
  return {
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    tags: post.tags,
  };
}

export function toCreate(values: PostFormValues): PostCreate {
  return {
    title: values.title,
    content: values.content,
    // Left out, the API writes the summary from the post's first lines.
    excerpt: values.excerpt || null,
    tags: values.tags,
  };
}

/**
 * Only what changed: the API leaves alone every field that isn't sent.
 * That matters most for the summary: sending back the one the API wrote
 * would make it the author's, and it would stop following the post.
 */
export function toUpdate(
  values: PostFormValues,
  changed: Partial<Record<keyof PostFormValues, unknown>>
): PostUpdate {
  const update: PostUpdate = {};
  if (changed.title) update.title = values.title;
  if (changed.content) update.content = values.content;
  // An empty string asks the API to write the summary again.
  if (changed.excerpt) update.excerpt = values.excerpt;
  if (changed.tags) update.tags = values.tags;
  return update;
}
