import { Link } from "@tanstack/react-router";

import type { AuthorSummary } from "@/api/generated/types.gen";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Person = Pick<AuthorSummary, "username" | "display_name" | "avatar_url">;

/** The name to show for someone: the one they chose, else their username. */
export function nameOf(person: Pick<Person, "username" | "display_name">) {
  return person.display_name || person.username;
}

export function UserAvatar({
  person,
  size = "default",
  className,
}: {
  person: Person;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      {/* Decorative: the name is always written next to it. */}
      {person.avatar_url ? (
        <AvatarImage src={person.avatar_url} alt="" />
      ) : null}
      <AvatarFallback>
        {Array.from(nameOf(person))[0]?.toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Who wrote something, linked to their profile. The API sends null when the
 * account no longer exists.
 */
export function AuthorLink({
  author,
  withAvatar = false,
  className,
}: {
  author: AuthorSummary | null;
  withAvatar?: boolean;
  className?: string;
}) {
  if (!author) {
    return <span className={className}>Deleted account</span>;
  }

  return (
    <Link
      to="/users/$username"
      params={{ username: author.username }}
      className={cn(
        "inline-flex min-h-11 max-w-full items-center gap-2.5 underline-offset-4 hover:underline",
        className
      )}
    >
      {withAvatar ? <UserAvatar person={author} /> : null}
      <span dir="auto" className="min-w-0 break-words">
        {nameOf(author)}
      </span>
    </Link>
  );
}
