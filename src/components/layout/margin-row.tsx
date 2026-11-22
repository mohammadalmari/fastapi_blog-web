import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MarginRowProps = {
  /** What the page knows about the writing: dates, authors, counts, actions. */
  rail?: ReactNode;
  /** The writing itself. */
  children: ReactNode;
  className?: string;
  railClassName?: string;
  contentClassName?: string;
};

/**
 * One row of the notebook layout every page is built from: a narrow rail,
 * the blue margin line, then the content. Rows stack with no gap between
 * them, so the line runs unbroken down the page. On a narrow screen the rail
 * wraps above the content.
 */
export function MarginRow({
  rail,
  children,
  className,
  railClassName,
  contentClassName,
}: MarginRowProps) {
  return (
    <div className={cn("flex flex-wrap", className)}>
      <div
        className={cn(
          // min-w-0: a long name wraps inside the rail. Without it the rail
          // grows to fit, and the margin line steps sideways on that row.
          "min-w-0 flex-[0_0_168px] pt-8 pr-6 text-sm leading-relaxed text-muted-foreground",
          railClassName
        )}
      >
        {rail}
      </div>
      <div
        className={cn(
          "min-w-0 flex-[999_1_480px] border-l-2 border-primary py-6 pl-8",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
