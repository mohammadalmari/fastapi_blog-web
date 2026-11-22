import { Link } from "@tanstack/react-router";

import { useMe } from "@/features/auth/hooks";
import { can } from "@/lib/permissions";

import { AccountMenu } from "@/components/layout/account-menu";
import { ThemeSwitch } from "@/components/layout/theme-switch";

const navLink =
  "inline-flex min-h-11 items-center font-semibold text-foreground decoration-primary decoration-2 underline-offset-[6px] hover:underline data-[status=active]:underline";

export function SiteHeader() {
  const me = useMe();

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1 py-4">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center text-[22px] font-extrabold tracking-tight text-foreground"
      >
        Draftwork Blog
      </Link>
      <nav aria-label="Main" className="flex flex-wrap items-center gap-x-7">
        <Link to="/" activeOptions={{ exact: true }} className={navLink}>
          Posts
        </Link>
        <Link to="/tags" className={navLink}>
          Tags
        </Link>
        {can(me, "posts:create") ? (
          <>
            <Link to="/write" className={navLink}>
              Write
            </Link>
            <Link to="/me/posts" className={navLink}>
              My posts
            </Link>
          </>
        ) : null}
        {can(me, "users:read:any") ? (
          <Link to="/admin/users" className={navLink}>
            Admin
          </Link>
        ) : can(me, "roles:read") ? (
          <Link to="/admin/roles" className={navLink}>
            Admin
          </Link>
        ) : null}
        <AccountMenu />
        <ThemeSwitch />
      </nav>
    </header>
  );
}
