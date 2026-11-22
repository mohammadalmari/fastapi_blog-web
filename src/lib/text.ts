// The zero-width joiners. Some scripts need them to join or separate
// letters, so they are allowed everywhere, as in the API.
const JOINERS = new Set(["‌", "‍"]);

// Control and formatting characters (NUL, escape, the invisible marks that
// reverse or hide text) and the line and paragraph separators.
const HIDDEN = /[\p{C}\p{Zl}\p{Zp}]/u;

/**
 * Whether text carries characters that can't be seen but change how it
 * reads. The API refuses them in anything displayed (titles, summaries,
 * tags); checking here says so before the request, and a paste from a word
 * processor is the usual source. Mirrors `has_hidden_characters` in the
 * API's app/core/text.py; the API's answer is the one that counts.
 */
export function hasHiddenCharacters(text: string, allowed = ""): boolean {
  for (const character of text) {
    if (JOINERS.has(character) || allowed.includes(character)) continue;
    if (HIDDEN.test(character)) return true;
  }
  return false;
}
