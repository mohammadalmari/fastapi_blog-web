import { useId } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { showErrorOnForm } from "@/features/auth/form-errors";
import type { CommentValues } from "@/features/comments/comment-form";
import { commentSchema } from "@/features/comments/comment-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/**
 * The one box comments are written in: a new comment, a reply, an edit.
 * `onSubmit` sends it; when that fails the API's reason is shown and the
 * text stays to try again.
 */
export function CommentForm({
  label,
  submitLabel,
  busyLabel,
  initial = "",
  onSubmit,
  onCancel,
  autoFocus = false,
}: {
  label: string;
  submitLabel: string;
  busyLabel: string;
  initial?: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const id = useId();
  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: initial },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ content }) => {
    try {
      await onSubmit(content);
      form.reset({ content: "" });
    } catch (error) {
      showErrorOnForm(error, form.setError, ["content"]);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="max-w-[66ch]">
      <FieldGroup className="gap-3">
        {errors.root ? (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={errors.content ? true : undefined}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Textarea
            id={id}
            rows={3}
            dir="auto"
            autoFocus={autoFocus}
            className="font-serif text-[17px] leading-relaxed md:text-[17px]"
            aria-invalid={errors.content ? true : undefined}
            {...form.register("content")}
          />
          <FieldError errors={[errors.content]} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? busyLabel : submitLabel}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
