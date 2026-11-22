const HOME = "/";

/**
 * Where to go after logging in, taken from the address bar. Anyone can put
 * anything there, so only a path on this site is accepted: a link to our
 * login page must not be able to send someone to another site afterwards.
 */
export function safeRedirect(target: unknown): string {
  if (typeof target !== "string") return HOME;
  // "/posts" is ours. "//evil.example" and "/\evil.example" are another
  // host to a browser, and anything with a scheme is too.
  if (!target.startsWith("/") || target.startsWith("//")) return HOME;
  if (target.includes("\\")) return HOME;
  // Characters a browser strips before reading the address could hide one
  // of the above.
  for (const character of target) {
    const code = character.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return HOME;
  }
  return target;
}
