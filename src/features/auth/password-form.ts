import { z } from "zod";

// What can be said without asking the API. How strong the new password
// must be is the API's rule (it differs between development and
// production); its reasons are shown under the field.
export const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z
      .string()
      .min(1, "Choose a new password.")
      .max(128, "Use at most 128 characters."),
    again: z.string().min(1, "Type the new password once more."),
  })
  .refine((values) => values.new_password === values.again, {
    path: ["again"],
    message: "The two don't match.",
  });

export type PasswordValues = z.infer<typeof passwordSchema>;
