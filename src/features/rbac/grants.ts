import type {
  Perm,
  RolePublic,
  RoleSummary,
  UserAdmin,
} from "@/api/generated/types.gen";
import { can } from "@/lib/permissions";

// The API's rules for handing out power (app/rbac/service.py and
// ensure_can_grant in app/rbac/policy.py). These decide what to offer;
// the API decides what happens, and its refusal is shown as it words it.

type Me = { id: string; permissions: string[] } | null | undefined;

/** The role that always holds every permission. */
export const ADMIN_ROLE = "admin";

/** Nobody gives out a permission they don't hold themselves. */
export function canGrant(me: Me, permissions: readonly string[]): boolean {
  return permissions.every((permission) => can(me, permission as Perm));
}

/**
 * Giving someone a role, or taking it away, both use the power the role
 * carries: the caller must hold every permission in it.
 */
export function canAssignRole(me: Me, role: Pick<RolePublic, "permissions">) {
  return can(me, "users:assign_roles") && canGrant(me, role.permissions);
}

/**
 * Switching an account off or on is power over everything it may do: the
 * caller must hold every permission its roles carry, and nobody changes
 * their own account's status. `roles` is every role, to look the
 * account's up by id.
 */
export function canChangeStatus(
  me: Me,
  user: Pick<UserAdmin, "id" | "roles">,
  roles: readonly RolePublic[]
): boolean {
  if (!me || me.id === user.id || !can(me, "users:deactivate")) return false;
  const byId = new Map(roles.map((role) => [role.id, role]));
  const held = user.roles.flatMap(
    (summary: RoleSummary) => byId.get(summary.id)?.permissions ?? []
  );
  return canGrant(me, held);
}

/**
 * Which of a role's permissions this person may tick or untick. Adding
 * one needs holding it; taking one away never does. The admin role's are
 * fixed: it always holds them all.
 */
export function permissionEditable(
  me: Me,
  role: Pick<RolePublic, "name" | "permissions"> | null,
  permission: string
): boolean {
  if (role?.name === ADMIN_ROLE) return false;
  if (role?.permissions.includes(permission as Perm)) return true;
  return can(me, permission as Perm);
}
