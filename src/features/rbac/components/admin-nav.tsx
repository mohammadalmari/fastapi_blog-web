import { Link } from "@tanstack/react-router";

import { useMe } from "@/features/auth/hooks";
import { can } from "@/lib/permissions";

const link =
  "inline-flex min-h-11 items-center text-base text-primary underline-offset-[6px] hover:underline data-[status=active]:font-semibold data-[status=active]:text-foreground data-[status=active]:underline data-[status=active]:decoration-primary data-[status=active]:decoration-2";

/** The administration pages this person may open, for each page's rail. */
export function AdminNav() {
  const me = useMe();

  return (
    <nav aria-label="Administration" className="flex flex-col items-start">
      {can(me, "users:read:any") ? (
        <Link to="/admin/users" className={link}>
          Accounts
        </Link>
      ) : null}
      {can(me, "roles:read") ? (
        <Link to="/admin/roles" className={link}>
          Roles
        </Link>
      ) : null}
    </nav>
  );
}
