import { Link } from "@tanstack/react-router";

const link =
  "inline-flex min-h-11 items-center text-base text-primary underline-offset-[6px] hover:underline data-[status=active]:font-semibold data-[status=active]:text-foreground data-[status=active]:underline data-[status=active]:decoration-primary data-[status=active]:decoration-2";

/** The settings pages, listed in the rail of each. */
export function SettingsNav() {
  return (
    <nav aria-label="Settings" className="flex flex-col items-start">
      <Link to="/settings/profile" className={link}>
        Profile
      </Link>
      <Link to="/settings/security" className={link}>
        Security
      </Link>
    </nav>
  );
}
