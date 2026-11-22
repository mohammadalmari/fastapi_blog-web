import { readFileSync } from "node:fs";

import type { CreatedAccount } from "./accounts.ts";

// The accounts every spec shares, made once per run by global-setup.ts.
// Shared because the API allows ten sign-ups an hour from one address: a
// test makes an account of its own only when signing up is what it tests.

export const PEOPLE_FILE = new URL("./.people.json", import.meta.url);

export type People = {
  /** Holds every permission: writes posts, and moderates. */
  admin: CreatedAccount;
  /** The "author" role: their own posts and nothing else. */
  author: CreatedAccount;
  /** A new account as the API makes it: may comment and like. */
  reader: CreatedAccount;
};

export function people(): People {
  return JSON.parse(readFileSync(PEOPLE_FILE, "utf8"));
}
