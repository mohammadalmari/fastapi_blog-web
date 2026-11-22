import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { authLogout, usersChangePassword } from "@/api/generated/sdk.gen";
import { showErrorOnForm } from "@/features/auth/form-errors";
import { useSession } from "@/features/auth/hooks";
import type { PasswordValues } from "@/features/auth/password-form";
import { passwordSchema } from "@/features/auth/password-form";
import { leaveLoginNotice } from "@/lib/notice";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const FIELDS = ["current_password", "new_password"] as const;

/**
 * Change the account's password. The API then ends every session, this one
 * included, so the page logs out and the login page says why.
 */
export function PasswordForm() {
  const session = useSession();
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "", again: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await usersChangePassword({
        body: {
          current_password: values.current_password,
          new_password: values.new_password,
        },
        throwOnError: true,
      });
    } catch (error) {
      return showErrorOnForm(error, form.setError, FIELDS);
    }
    leaveLoginNotice("Your password is changed. Log in with the new one.");
    // The session is already over on the server; this only clears the
    // cookie it left, and nothing depends on it working.
    await authLogout().catch(() => undefined);
    session.logout();
  });

  return (
    <form onSubmit={submit} noValidate className="max-w-sm">
      <FieldGroup>
        {errors.root ? (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={errors.current_password ? true : undefined}>
          <FieldLabel htmlFor="password-current">Current password</FieldLabel>
          <Input
            id="password-current"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.current_password ? true : undefined}
            {...form.register("current_password")}
          />
          <FieldError errors={[errors.current_password]} />
        </Field>
        <Field data-invalid={errors.new_password ? true : undefined}>
          <FieldLabel htmlFor="password-new">New password</FieldLabel>
          <Input
            id="password-new"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.new_password ? true : undefined}
            {...form.register("new_password")}
          />
          <FieldError errors={[errors.new_password]} />
        </Field>
        <Field data-invalid={errors.again ? true : undefined}>
          <FieldLabel htmlFor="password-again">New password, again</FieldLabel>
          <Input
            id="password-again"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.again ? true : undefined}
            {...form.register("again")}
          />
          <FieldError errors={[errors.again]} />
        </Field>
        <Field>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Changing" : "Change password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
