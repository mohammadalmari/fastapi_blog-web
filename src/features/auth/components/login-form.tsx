import { useForm } from "react-hook-form";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { authLogin } from "@/api/generated/sdk.gen";
import { showErrorOnForm } from "@/features/auth/form-errors";
import { useSession } from "@/features/auth/hooks";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({
  username: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const session = useSession();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      const { data } = await authLogin({ body: values, throwOnError: true });
      // The page changes by itself: the session tells the router, and the
      // login route's guard sends a logged-in person on their way.
      session.login(data.access_token);
    } catch (error) {
      showErrorOnForm(error, form.setError, ["username", "password"]);
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
        <Field data-invalid={errors.username ? true : undefined}>
          <FieldLabel htmlFor="login-username">Email or username</FieldLabel>
          <Input
            id="login-username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={errors.username ? true : undefined}
            {...form.register("username")}
          />
          <FieldError errors={[errors.username]} />
        </Field>
        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Logging in" : "Log in"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
