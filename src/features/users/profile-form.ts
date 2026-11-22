import { z } from "zod";

import type { ProfileUpdate, UserMe } from "@/api/generated/types.gen";
import { hasHiddenCharacters } from "@/lib/text";

// The API's rules for an account's public details (app/users/schemas.py),
// so the form can name a problem before sending. The API checks again.
export const DISPLAY_NAME_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 500;
const LINE_BREAKS_AND_TABS = "\n\r\t";

const HIDDEN =
  "Remove the invisible characters, which often come along with pasted text.";

/**
 * A username is part of the profile's address, hence the narrow alphabet.
 * Typed in any case; stored in lowercase.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "Use 3 to 30 letters, digits or underscores.");

export const profileSchema = z.object({
  username: usernameSchema,
  display_name: z
    .string()
    .trim()
    .max(
      DISPLAY_NAME_MAX_LENGTH,
      `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters.`
    )
    .refine((name) => !hasHiddenCharacters(name), HIDDEN),
  bio: z
    .string()
    .trim()
    .max(BIO_MAX_LENGTH, `Use at most ${BIO_MAX_LENGTH} characters.`)
    .refine((bio) => !hasHiddenCharacters(bio, LINE_BREAKS_AND_TABS), HIDDEN),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export function profileOf(me: UserMe): ProfileValues {
  return {
    username: me.username,
    display_name: me.display_name ?? "",
    bio: me.bio ?? "",
  };
}

/**
 * Only what changed: the API leaves alone what isn't sent. An emptied name
 * or bio is sent as an empty string, which clears it.
 */
export function toProfileUpdate(
  values: ProfileValues,
  changed: Partial<Record<keyof ProfileValues, unknown>>
): ProfileUpdate {
  const update: ProfileUpdate = {};
  if (changed.username) update.username = values.username;
  if (changed.display_name) update.display_name = values.display_name;
  if (changed.bio) update.bio = values.bio;
  return update;
}
