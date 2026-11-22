import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError } from "@/api/errors";

const UNEXPECTED = "Something went wrong. Try again.";

function wait(seconds: number) {
  if (seconds < 90) return "a minute";
  return `${Math.ceil(seconds / 60)} minutes`;
}

/** What to tell the person about a failed request, in one sentence or two. */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return UNEXPECTED;
  if (error.status === 429 && error.retryAfterSeconds !== null) {
    return `Too many attempts. Try again in ${wait(error.retryAfterSeconds)}.`;
  }
  return error.message;
}

/**
 * Put a failed request's messages on the form: under the field the API
 * named when the form has it, otherwise above the form.
 */
export function showErrorOnForm<Values extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<Values>,
  fields: readonly Path<Values>[]
) {
  const known = new Set<string>(fields);
  const elsewhere: string[] = [];

  if (error instanceof ApiError) {
    for (const [field, messages] of Object.entries(error.fields)) {
      if (known.has(field)) {
        setError(field as Path<Values>, { message: messages.join(" ") });
      } else {
        elsewhere.push(...messages);
      }
    }
    // Every problem found a field: nothing to say above the form.
    if (Object.keys(error.fields).length > 0 && elsewhere.length === 0) return;
  }

  setError("root", {
    message: elsewhere.length > 0 ? elsewhere.join(" ") : describeError(error),
  });
}
