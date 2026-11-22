import { Link } from "@tanstack/react-router";

import { AccountMenu } from "@/components/layout/account-menu";
import { ThemeSwitch } from "@/components/layout/theme-switch";

const navLink =
  "inline-flex min-h-11 items-center font-semibold text-foreground decoration-primary decoration-2 underline-offset-[6px] hover:underline data-[status=active]:underline";

export function SiteHeader() {
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
        <AccountMenu />
        <ThemeSwitch />
      </nav>
    </header>
  );
}
