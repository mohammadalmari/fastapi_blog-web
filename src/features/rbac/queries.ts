import { z } from "zod";

import { usersListUsersInfiniteQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import { usersListUsers } from "@/api/generated/sdk.gen";
import type { PageUserAdmin } from "@/api/generated/types.gen";
import { pagedOptions } from "@/api/paging";

export const usersSearchSchema = z.object({
  status: z.enum(["active", "deactivated"]).optional().catch(undefined),
});

export type UsersFilters = z.infer<typeof usersSearchSchema>;

/** Every account, newest first, with its roles. */
export function usersOptions(filters: UsersFilters = {}) {
  const query = {
    limit: 20,
    ...(filters.status ? { is_active: filters.status === "active" } : {}),
  };

  return pagedOptions<PageUserAdmin>(
    usersListUsersInfiniteQueryKey({ query }),
    async ({ cursor, signal }) => {
      const { data } = await usersListUsers({
        query: { ...query, cursor },
        signal,
        throwOnError: true,
      });
      return data;
    }
  );
}
