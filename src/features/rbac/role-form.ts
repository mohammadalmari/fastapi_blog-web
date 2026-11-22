import { z } from "zod";

import type {
  Perm,
  RoleCreate,
  RolePublic,
  RoleUpdate,
} from "@/api/generated/types.gen";

// The API's rules for a role (app/rbac/schemas.py).
export const ROLE_DESCRIPTION_MAX_LENGTH = 200;

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{2,40}$/, "Use 2 to 40 letters, digits or underscores."),
  description: z
    .string()
    .trim()
    .max(
      ROLE_DESCRIPTION_MAX_LENGTH,
      `Use at most ${ROLE_DESCRIPTION_MAX_LENGTH} characters.`
    ),
  permissions: z.array(z.string()),
  is_default: z.boolean(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

export const EMPTY_ROLE: RoleFormValues = {
  name: "",
  description: "",
  permissions: [],
  is_default: false,
};

export function roleValuesOf(role: RolePublic): RoleFormValues {
  return {
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    is_default: role.is_default,
  };
}

export function toRoleCreate(values: RoleFormValues): RoleCreate {
  return {
    name: values.name,
    description: values.description,
    permissions: values.permissions as Perm[],
  };
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

/**
 * Only what differs from the role as it is. The default flag is sent only
 * to turn it on: the API refuses to turn it off, since new accounts must
 * get some role ("make another role the default instead").
 */
export function toRoleUpdate(
  role: RolePublic,
  values: RoleFormValues
): RoleUpdate {
  const update: RoleUpdate = {};
  if (values.name !== role.name) update.name = values.name;
  if (values.description !== role.description) {
    update.description = values.description;
  }
  if (!sameSet(values.permissions, role.permissions)) {
    update.permissions = values.permissions as Perm[];
  }
  if (values.is_default && !role.is_default) update.is_default = true;
  return update;
}
