import { useState } from "react";

import { Link } from "@tanstack/react-router";

import { useMe } from "@/features/auth/hooks";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { AccountMenu } from "@/components/layout/account-menu";
import { ThemeSwitch } from "@/components/layout/theme-switch";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { MenuIcon } from "lucide-react";

const navLink =
  "inline-flex min-h-11 items-center font-semibold text-foreground decoration-primary decoration-2 underline-offset-[6px] hover:underline data-[status=active]:underline";

/** The places this person may go, in the header's order. */
function NavLinks() {
  const me = useMe();

  return (
    <>
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
    </>
  );
}

/**
 * The wordmark and the way around. On a wide screen every link is in a
 * row; on a narrow one they are behind a menu button, because an author's
 * or an administrator's eight would fill the screen before the page did.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1 py-4">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center text-[22px] font-extrabold tracking-tight text-foreground"
      >
        Draftwork Blog
      </Link>

      <nav
        aria-label="Main"
        className="hidden flex-wrap items-center gap-x-7 md:flex"
      >
        <NavLinks />
        <ThemeSwitch />
      </nav>

      <div className="flex items-center gap-1 md:hidden">
        <ThemeSwitch />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg">
              <MenuIcon data-icon="inline-start" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="px-6">
            <SheetHeader className="px-0">
              <SheetTitle>Draftwork Blog</SheetTitle>
              <SheetDescription className="sr-only">
                Where to go next
              </SheetDescription>
            </SheetHeader>
            <nav
              aria-label="Main"
              className={cn("flex flex-col items-start gap-1 text-lg")}
              // Choosing a place closes the menu; the page changes behind it.
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              <NavLinks />
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
