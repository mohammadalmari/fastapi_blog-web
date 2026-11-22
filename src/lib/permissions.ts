import type { Perm } from "@/api/generated/types.gen";

type HasPermissions = { permissions: string[] } | null | undefined;

/**
 * Whether this person may do something, by the permissions the API says
 * they hold. Never decide by role name: administrators invent roles.
 *
 * This only decides what to show. The API checks every request itself.
 */
export function can(me: HasPermissions, permission: Perm): boolean {
  return me?.permissions.includes(permission) ?? false;
}

/**
 * For something with an owner: allowed on anyone's with `any`, or on your
 * own with `own`. Mirrors the API's `authorize(any_=, own=, owner_id=)`.
 */
export function canOn(
  me: (HasPermissions & { id: string }) | null | undefined,
  ownerId: string | null | undefined,
  permissions: { any: Perm; own?: Perm }
): boolean {
  if (!me) return false;
  if (can(me, permissions.any)) return true;
  return (
    permissions.own !== undefined &&
    ownerId === me.id &&
    can(me, permissions.own)
  );
}
