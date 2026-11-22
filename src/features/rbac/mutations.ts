import type { QueryClient } from "@tanstack/react-query";

import {
  rolesCreateRole,
  rolesDeleteRole,
  rolesUpdateRole,
  usersAssignRoles,
  usersSetStatus,
} from "@/api/generated/sdk.gen";
import type {
  RoleCreate,
  RolePublic,
  RoleUpdate,
  UserAdmin,
} from "@/api/generated/types.gen";

// Everything an administrator changes. Afterwards every cached query is
// marked stale: a role's permissions decide what every page shows,
// including to the administrator, whose own roles may have just changed.

export function adminActions(queryClient: QueryClient) {
  const settle = () => void queryClient.invalidateQueries();

  return {
    async assignRoles(user: UserAdmin, roleIds: string[]) {
      const { data } = await usersAssignRoles({
        path: { user_id: user.id },
        body: { role_ids: roleIds },
        throwOnError: true,
      });
      settle();
      return data;
    },

    async setActive(user: UserAdmin, active: boolean) {
      const { data } = await usersSetStatus({
        path: { user_id: user.id },
        body: { is_active: active },
        throwOnError: true,
      });
      settle();
      return data;
    },

    async createRole(body: RoleCreate) {
      const { data } = await rolesCreateRole({ body, throwOnError: true });
      settle();
      return data;
    },

    async updateRole(role: RolePublic, body: RoleUpdate) {
      // Nothing changed: there is nothing to ask the API for.
      if (Object.keys(body).length === 0) return role;
      const { data } = await rolesUpdateRole({
        path: { role_id: role.id },
        body,
        throwOnError: true,
      });
      settle();
      return data;
    },

    async deleteRole(role: RolePublic) {
      await rolesDeleteRole({ path: { role_id: role.id }, throwOnError: true });
      settle();
    },
  };
}
