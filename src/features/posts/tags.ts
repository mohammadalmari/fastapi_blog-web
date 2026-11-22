// The API's rules for tags (app/posts/rules.py), so a tag can be shown as
// it will be stored, and refused with a reason, while it is being typed.
// The API applies the same rules again and its answer is the one that
// counts.

export const TAG_MAX_LENGTH = 30;
export const MAX_TAGS = 10;

/** " Mongo DB " and "mongo-db" are one tag. */
export function normalizeTag(tag: string): string {
  // NFKC folds look-alike forms (full-width letters, ligatures) into the
  // ordinary ones. The API also case-folds, which differs from lowercasing
  // for a handful of letters; it has the last word.
  return tag
    .normalize("NFKC")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join("-");
}

const ALLOWED = /^[\p{L}\p{M}\p{N}+#.\-_]+$/u;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const STARTS_WITH_MARK = /^\p{M}/u;

/** Why a normalized tag is refused, or null if it is fine. */
export function tagProblem(tag: string): string | null {
  // Counted in characters, not UTF-16 units, as the API counts them.
  const length = Array.from(tag).length;
  if (length < 1 || length > TAG_MAX_LENGTH) {
    return `A tag has 1 to ${TAG_MAX_LENGTH} characters.`;
  }
  if (!ALLOWED.test(tag)) {
    return "A tag may contain letters, digits and + # . - _";
  }
  if (!LETTER_OR_DIGIT.test(tag)) {
    return "A tag needs at least one letter or digit.";
  }
  if (STARTS_WITH_MARK.test(tag)) {
    return "A tag can't start with an accent.";
  }
  return null;
}
