import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

import { usersReadMeQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import { usersUpdateMe } from "@/api/generated/sdk.gen";
import type { UserMe } from "@/api/generated/types.gen";
import { showErrorOnForm } from "@/features/auth/form-errors";
import type { ProfileValues } from "@/features/users/profile-form";
import {
  profileOf,
  profileSchema,
  toProfileUpdate,
} from "@/features/users/profile-form";

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
import { Textarea } from "@/components/ui/textarea";

const FIELDS = ["username", "display_name", "bio"] as const;

/** The account's public details: what its profile page shows. */
export function ProfileForm({ me }: { me: UserMe }) {
  const queryClient = useQueryClient();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileOf(me),
  });
  const { errors, isDirty, isSubmitting, dirtyFields } = form.formState;
  const [saved, setSaved] = useState(false);

  const submit = form.handleSubmit(async (values) => {
    setSaved(false);
    try {
      const { data } = await usersUpdateMe({
        body: toProfileUpdate(values, dirtyFields),
        throwOnError: true,
      });
      queryClient.setQueryData(usersReadMeQueryKey(), data);
      // The name is shown next to posts and comments everywhere.
      void queryClient.invalidateQueries();
      form.reset(profileOf(data));
      setSaved(true);
    } catch (error) {
      showErrorOnForm(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="max-w-xl">
      <FieldGroup>
        {errors.root ? (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={errors.display_name ? true : undefined}>
          <FieldLabel htmlFor="profile-name">Name</FieldLabel>
          <Input
            id="profile-name"
            dir="auto"
            autoComplete="name"
            aria-invalid={errors.display_name ? true : undefined}
            aria-describedby="profile-name-hint"
            {...form.register("display_name")}
          />
          <FieldDescription id="profile-name-hint">
            Shown next to what you write. Leave it empty to show your username.
          </FieldDescription>
          <FieldError errors={[errors.display_name]} />
        </Field>
        <Field data-invalid={errors.username ? true : undefined}>
          <FieldLabel htmlFor="profile-username">Username</FieldLabel>
          <Input
            id="profile-username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={errors.username ? true : undefined}
            aria-describedby="profile-username-hint"
            {...form.register("username")}
          />
          <FieldDescription id="profile-username-hint">
            Your profile&apos;s address. Changing it frees the old one for
            anyone, and links to the old address stop working.
          </FieldDescription>
          <FieldError errors={[errors.username]} />
        </Field>
        <Field data-invalid={errors.bio ? true : undefined}>
          <FieldLabel htmlFor="profile-bio">About you</FieldLabel>
          <Textarea
            id="profile-bio"
            rows={4}
            dir="auto"
            className="font-serif"
            aria-invalid={errors.bio ? true : undefined}
            {...form.register("bio")}
          />
          <FieldError errors={[errors.bio]} />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Saving" : "Save profile"}
          </Button>
          {saved && !isDirty ? (
            <p role="status" className="font-semibold">
              Saved.
            </p>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
