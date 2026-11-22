import type { KeyboardEvent } from "react";
import { useState } from "react";

import { MAX_TAGS, normalizeTag, tagProblem } from "@/features/posts/tags";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { XIcon } from "lucide-react";

/**
 * A post's tags: type one and press Enter or a comma. Each is shown as it
 * will be stored (lowercase, spaces as dashes), or refused with the reason.
 */
export function TagInput({
  id,
  value,
  onChange,
  invalid = false,
}: {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  invalid?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const full = value.length >= MAX_TAGS;

  const add = () => {
    const tag = normalizeTag(typed);
    if (!tag) return setTyped("");
    const refused = tagProblem(tag);
    if (refused) return setProblem(refused);
    // Adding one that is already there changes nothing, quietly.
    if (!value.includes(tag)) onChange([...value, tag]);
    setTyped("");
    setProblem(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      // Enter must not send the whole form.
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && typed === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul aria-label="Added so far" className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="h-8 gap-1 pr-1 text-sm">
                <span dir="auto">{tag}</span>
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  className="inline-flex size-6 items-center justify-center rounded-sm hover:bg-primary/15"
                  onClick={() => onChange(value.filter((kept) => kept !== tag))}
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={typed}
        disabled={full}
        placeholder={full ? "" : "Add a tag"}
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={invalid || problem !== null ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          setTyped(event.target.value);
          setProblem(null);
        }}
        onKeyDown={onKeyDown}
        // Leaving the box keeps what was typed, as a tag.
        onBlur={add}
      />
      <p
        id={`${id}-hint`}
        role={problem ? "alert" : undefined}
        className={
          problem ? "text-sm text-destructive" : "text-sm text-muted-foreground"
        }
      >
        {problem ??
          `${value.length} of ${MAX_TAGS}. Press Enter after each; stored in lowercase.`}
      </p>
    </div>
  );
}
