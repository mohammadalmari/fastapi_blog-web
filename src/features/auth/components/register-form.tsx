import { useForm } from "react-hook-form";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { authLogin, authRegister } from "@/api/generated/sdk.gen";
import { showErrorOnForm } from "@/features/auth/form-errors";
import { useSession } from "@/features/auth/hooks";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// Only what can be said without asking: the API owns the real rules (which
// usernames are taken, how strong a password must be, and that differs
// between development and production) and its answers are shown under the
// fields.
const schema = z.object({
  email: z.string().trim().min(1, "Enter your email."),
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(30, "Use at most 30 characters."),
  password: z
    .string()
    .min(1, "Choose a password.")
    .max(128, "Use at most 128 characters."),
});

type Values = z.infer<typeof schema>;

export function RegisterForm() {
  const session = useSession();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", username: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await authRegister({ body: values, throwOnError: true });
      // Signing up doesn't log in: the API hands out tokens in one place.
      const { data } = await authLogin({
        body: { username: values.email, password: values.password },
        throwOnError: true,
      });
      session.login(data.access_token);
    } catch (error) {
      showErrorOnForm(error, form.setError, ["email", "username", "password"]);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="max-w-sm">
      <FieldGroup>
        {errors.root ? (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="register-email">Email</FieldLabel>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={errors.username ? true : undefined}>
          <FieldLabel htmlFor="register-username">Username</FieldLabel>
          <Input
            id="register-username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={errors.username ? true : undefined}
            aria-describedby="register-username-hint"
            {...form.register("username")}
          />
          <FieldDescription id="register-username-hint">
            Letters, digits and underscores. It appears in your profile&apos;s
            address.
          </FieldDescription>
          <FieldError errors={[errors.username]} />
        </Field>
        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="register-password">Password</FieldLabel>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Signing up" : "Sign up"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
