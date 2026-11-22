import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

/** A tag, linked to the posts that carry it. */
export function TagLink({
  tag,
  children,
  className,
}: {
  tag: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to="/"
      search={{ tag }}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 text-primary underline-offset-4 hover:underline",
        className
      )}
    >
      {/* Tags are written by users, in any script. */}
      <span dir="auto">{tag}</span>
      {children}
    </Link>
  );
}
