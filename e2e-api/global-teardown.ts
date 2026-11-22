import { rmSync } from "node:fs";

import { dropDatabase } from "./environment.ts";
import { PEOPLE_FILE } from "./people.ts";

// Leave nothing behind: the run's accounts and posts go with its database.
export default function globalTeardown() {
  dropDatabase();
  rmSync(PEOPLE_FILE, { force: true });
}
