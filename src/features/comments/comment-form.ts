import { z } from "zod";

import { hasHiddenCharacters } from "@/lib/text";

// The API's limits (app/comments/schemas.py): 1 to 5,000 characters after
// trimming, and no invisible characters but line breaks and tabs.
export const COMMENT_MAX_LENGTH = 5_000;
const LINE_BREAKS_AND_TABS = "\n\r\t";

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(
      COMMENT_MAX_LENGTH,
      `A comment holds at most ${COMMENT_MAX_LENGTH.toLocaleString("en")} characters.`
    )
    .refine(
      (content) => !hasHiddenCharacters(content, LINE_BREAKS_AND_TABS),
      "Remove the invisible characters, which often come along with pasted text."
    ),
});

export type CommentValues = z.infer<typeof commentSchema>;
