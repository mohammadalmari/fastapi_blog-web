import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import type {
  PermissionPublic,
  RolePublic,
  UserMe,
} from "@/api/generated/types.gen";
import { showErrorOnForm } from "@/features/auth/form-errors";
import { ADMIN_ROLE, permissionEditable } from "@/features/rbac/grants";
import { adminActions } from "@/features/rbac/mutations";
import type { RoleFormValues } from "@/features/rbac/role-form";
import {
  EMPTY_ROLE,
  roleFormSchema,
  roleValuesOf,
  toRoleCreate,
  toRoleUpdate,
} from "@/features/rbac/role-form";
import { can } from "@/lib/permissions";

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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const FIELDS = ["name", "description", "permissions", "is_default"] as const;

// The permission catalog's resources, in the reader's words and order.
const GROUPS: Array<{ resource: string; title: string }> = [
  { resource: "posts", title: "Posts" },
  { resource: "comments", title: "Comments" },
  { resource: "likes", title: "Likes" },
  { resource: "users", title: "Accounts" },
  { resource: "roles", title: "Roles" },
];

/**
 * Create a role, or edit `role`. Permissions are chosen from the catalog,
 * each named as the API describes it. Which boxes may change follows the
 * API's rule: nobody hands out a permission they don't hold.
 */
export function RoleForm({
  role,
  permissions,
  me,
}: {
  role?: RolePublic;
  permissions: PermissionPublic[];
  me: UserMe;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const actions = adminActions(queryClient);
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: role ? roleValuesOf(role) : EMPTY_ROLE,
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mayEdit = role ? can(me, "roles:update") : can(me, "roles:create");
  const mayDelete = role && !role.is_system && can(me, "roles:delete");
  const isAdmin = role?.name === ADMIN_ROLE;
  const lacksSome = permissions.some((permission) => !can(me, permission.id));

  const submit = form.handleSubmit(async (values) => {
    setSaved(false);
    try {
      if (!role) {
        const created = await actions.createRole(toRoleCreate(values));
        await navigate({
          to: "/admin/roles/$roleId",
          params: { roleId: created.id },
        });
        return;
      }
      const updated = await actions.updateRole(
        role,
        toRoleUpdate(role, values)
      );
      form.reset(roleValuesOf(updated));
      setSaved(true);
    } catch (error) {
      showErrorOnForm(error, form.setError, FIELDS);
    }
  });

  const remove = async () => {
    if (!role) return;
    setDeleting(true);
    try {
      await actions.deleteRole(role);
      await navigate({ to: "/admin/roles" });
    } catch (error) {
      setConfirmingDelete(false);
      showErrorOnForm(error, form.setError, FIELDS);
    }
    setDeleting(false);
  };

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {errors.root ? (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-x-8 gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="role-name">Name</FieldLabel>
            <Input
              id="role-name"
              autoCapitalize="none"
              spellCheck={false}
              // The two built-in roles keep their names: the app looks them up.
              disabled={!mayEdit || role?.is_system}
              aria-invalid={errors.name ? true : undefined}
              {...form.register("name")}
            />
            {role?.is_system ? (
              <FieldDescription>
                A built-in role: it can&apos;t be renamed or deleted.
              </FieldDescription>
            ) : null}
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={errors.description ? true : undefined}>
            <FieldLabel htmlFor="role-description">Description</FieldLabel>
            <Input
              id="role-description"
              disabled={!mayEdit}
              aria-invalid={errors.description ? true : undefined}
              {...form.register("description")}
            />
            <FieldError errors={[errors.description]} />
          </Field>
        </div>

        <Controller
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <Field orientation="horizontal" className="min-h-11">
              <Checkbox
                id="role-default"
                checked={field.value}
                // Turned on only: new accounts must always get some role.
                disabled={!mayEdit || isAdmin || role?.is_default}
                onCheckedChange={(on) => field.onChange(on === true)}
              />
              <FieldLabel htmlFor="role-default">
                Give this role to new accounts
              </FieldLabel>
            </Field>
          )}
        />
        {role?.is_default ? (
          <p className="-mt-4 text-sm text-muted-foreground">
            New accounts get this role. To change that, make another role the
            default.
          </p>
        ) : isAdmin ? (
          <p className="-mt-4 text-sm text-muted-foreground">
            Anyone can sign up, so the admin role can never be the default.
          </p>
        ) : null}

        <Controller
          control={form.control}
          name="permissions"
          render={({ field }) => (
            <>
              {GROUPS.map((group) => {
                const inGroup = permissions.filter(
                  (permission) => permission.resource === group.resource
                );
                if (inGroup.length === 0) return null;
                return (
                  <FieldSet key={group.resource}>
                    <FieldLegend className="text-xl font-semibold tracking-tight">
                      {group.title}
                    </FieldLegend>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6">
                      {inGroup.map((permission) => {
                        const id = `permission-${permission.id}`;
                        const on = field.value.includes(permission.id);
                        return (
                          <Field
                            key={permission.id}
                            orientation="horizontal"
                            className="min-h-11 py-1.5"
                          >
                            <Checkbox
                              id={id}
                              checked={on}
                              disabled={
                                !mayEdit ||
                                !permissionEditable(
                                  me,
                                  role ?? null,
                                  permission.id
                                )
                              }
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked === true
                                    ? [...field.value, permission.id]
                                    : field.value.filter(
                                        (kept) => kept !== permission.id
                                      )
                                )
                              }
                            />
                            <FieldLabel
                              htmlFor={id}
                              className="flex-col items-start gap-0"
                            >
                              <span>{permission.description}</span>
                              <span className="text-[13px] font-normal text-muted-foreground">
                                {permission.id}
                              </span>
                            </FieldLabel>
                          </Field>
                        );
                      })}
                    </div>
                  </FieldSet>
                );
              })}
            </>
          )}
        />

        {isAdmin ? (
          <p className="max-w-[62ch] border-s-4 border-highlight bg-highlight/25 px-4 py-3">
            The admin role always holds every permission.
          </p>
        ) : lacksSome && mayEdit ? (
          <p className="max-w-[62ch] border-s-4 border-highlight bg-highlight/25 px-4 py-3">
            You can only tick permissions you hold yourself. Nobody grants what
            they don&apos;t have.
          </p>
        ) : null}

        {mayEdit ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || (role !== undefined && !isDirty)}
            >
              {isSubmitting ? "Saving" : role ? "Save changes" : "Create role"}
            </Button>
            {saved && !isDirty ? (
              <p role="status" className="font-semibold">
                Saved.
              </p>
            ) : null}
            {mayDelete ? (
              <Button
                type="button"
                variant="link"
                className="h-11 px-0 text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete role
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">
            You can look at roles but not change them.
          </p>
        )}
      </FieldGroup>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the {role?.name} role?</AlertDialogTitle>
            <AlertDialogDescription>
              It is taken from everyone who holds it, and with it what it let
              them do. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep role</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {deleting ? "Deleting" : "Delete role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
