import { describe, expect, it } from "vitest";

import { passwordSchema } from "@/features/auth/password-form";
import { leaveLoginNotice, takeLoginNotice } from "@/lib/notice";

import { AVATAR_MAX_BYTES, avatarProblem } from "./avatar";
import { profileSchema, toProfileUpdate, usernameSchema } from "./profile-form";

describe("usernameSchema", () => {
  it.each([
    ["jane_doe", "jane_doe"],
    ["  Jane  ", "jane"],
    ["A1_", "a1_"],
    ["x".repeat(30), "x".repeat(30)],
  ])("accepts %j as %j", (typed, stored) => {
    expect(usernameSchema.parse(typed)).toBe(stored);
  });

  // "me" must never be a username: /users/me is the caller's own account.
  it.each([
    ["two characters", "me"],
    ["31 characters", "x".repeat(31)],
    ["a space inside", "jane doe"],
    ["a dash", "jane-doe"],
    ["an at sign", "jane@example.com"],
    ["a letter outside a-z", "jané"],
    ["a slash", "a/b"],
    ["nothing", ""],
  ])("refuses %s", (_name, typed) => {
    expect(usernameSchema.safeParse(typed).success).toBe(false);
  });
});

const profile = { username: "jane", display_name: "Jane", bio: "Hello." };
const problems = (change: object) => {
  const result = profileSchema.safeParse({ ...profile, ...change });
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);
};

describe("profileSchema", () => {
  it("accepts an empty name and bio: that clears them", () => {
    expect(problems({ display_name: "", bio: "" })).toEqual([]);
  });

  it("lets a bio span several lines", () => {
    expect(problems({ bio: "One.\n\nTwo." })).toEqual([]);
  });

  it.each([
    [
      "a name over 50 characters",
      { display_name: "x".repeat(51) },
      "display_name",
    ],
    ["a name with a line break", { display_name: "Ja\nne" }, "display_name"],
    [
      "a name with a right-to-left override",
      { display_name: "a‮b" },
      "display_name",
    ],
    ["a bio over 500 characters", { bio: "x".repeat(501) }, "bio"],
    ["a bio with a zero-width space", { bio: "a​b" }, "bio"],
  ])("refuses %s", (_name, change, field) => {
    expect(problems(change)).toContain(field);
  });
});

describe("toProfileUpdate", () => {
  it("sends only what changed", () => {
    expect(toProfileUpdate(profile, { bio: true })).toEqual({ bio: "Hello." });
  });

  // Sending the username back unchanged would be harmless today, but a
  // field that wasn't touched is not this form's to send.
  it("sends nothing when nothing changed", () => {
    expect(toProfileUpdate(profile, {})).toEqual({});
  });

  it("sends an emptied name as empty, which clears it", () => {
    expect(
      toProfileUpdate({ ...profile, display_name: "" }, { display_name: true })
    ).toEqual({ display_name: "" });
  });
});

describe("avatarProblem", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])("accepts %s", (type) => {
    expect(avatarProblem({ type, size: 1000 })).toBeNull();
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", "text/html", ""])(
    "refuses %j",
    (type) => {
      expect(avatarProblem({ type, size: 1000 })).toMatch(/PNG, JPEG or WebP/);
    }
  );

  it("accepts exactly 2 MB and refuses one byte more", () => {
    const type = "image/png";

    expect(avatarProblem({ type, size: AVATAR_MAX_BYTES })).toBeNull();
    expect(avatarProblem({ type, size: AVATAR_MAX_BYTES + 1 })).toMatch(/2 MB/);
  });
});

describe("passwordSchema", () => {
  const filled = {
    current_password: "old-password",
    new_password: "new-password",
    again: "new-password",
  };

  it("accepts a new password typed the same twice", () => {
    expect(passwordSchema.safeParse(filled).success).toBe(true);
  });

  it("refuses two that don't match, and says so under the second", () => {
    const result = passwordSchema.safeParse({
      ...filled,
      again: "new-pasword",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["again"]);
  });

  it.each(["current_password", "new_password", "again"])(
    "refuses an empty %s",
    (field) => {
      expect(passwordSchema.safeParse({ ...filled, [field]: "" }).success).toBe(
        false
      );
    }
  );
});

describe("the login notice", () => {
  it("is shown once", () => {
    leaveLoginNotice("Your password is changed.");

    expect(takeLoginNotice()).toBe("Your password is changed.");
    expect(takeLoginNotice()).toBeNull();
  });

  it("is nothing when no page left one", () => {
    expect(takeLoginNotice()).toBeNull();
  });
});
