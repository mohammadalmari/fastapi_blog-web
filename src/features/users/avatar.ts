// The API's limits for an avatar (AVATAR_MAX_BYTES and the accepted formats
// in the API's app/users/avatars.py). Checked before sending, so a
// too-large picture isn't uploaded only to be refused. The API checks
// again, and looks inside the file: a renamed file passes here, not there.

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Why a chosen file can't be an avatar, or null if it can be sent. */
export function avatarProblem(
  file: Pick<File, "type" | "size">
): string | null {
  if (!AVATAR_TYPES.includes(file.type)) {
    return "Choose a PNG, JPEG or WebP picture.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "The picture must be at most 2 MB.";
  }
  return null;
}
