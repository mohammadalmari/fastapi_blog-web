import { describeError } from "@/features/auth/form-errors";
import { count } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { HeartIcon } from "lucide-react";

type LikeButtonProps = {
  liked: boolean;
  likes: number;
  onToggle: () => void;
  /** False for someone logged in whose roles don't include liking. */
  allowed?: boolean;
  /** Why the last attempt failed, if it did. */
  error?: unknown;
  /** "button" under a post; "text" in a comment's row of actions. */
  variant?: "button" | "text";
};

/**
 * A like, as a pressed or unpressed button with the count. Someone who may
 * not like sees the count alone; a like they already gave can always be
 * taken back.
 */
export function LikeButton({
  liked,
  likes,
  onToggle,
  allowed = true,
  error,
  variant = "button",
}: LikeButtonProps) {
  if (!allowed && !liked) {
    return <span>{count(likes, "like")}</span>;
  }

  const label = `${liked ? "Liked" : "Like"}, ${likes}`;
  const problem = error ? (
    <p role="alert" className="text-sm text-destructive">
      That didn&apos;t go through. {describeError(error)}
    </p>
  ) : null;

  if (variant === "text") {
    return (
      <>
        <button
          type="button"
          aria-pressed={liked}
          onClick={onToggle}
          className={cn(
            "inline-flex min-h-11 items-center underline-offset-4 hover:underline",
            liked ? "font-semibold text-foreground" : "text-primary"
          )}
        >
          {label}
        </button>
        {problem}
      </>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        type="button"
        size="lg"
        variant={liked ? "default" : "outline"}
        aria-pressed={liked}
        onClick={onToggle}
      >
        <HeartIcon
          data-icon="inline-start"
          className={liked ? "fill-current" : undefined}
        />
        {label}
      </Button>
      {problem}
    </div>
  );
}
