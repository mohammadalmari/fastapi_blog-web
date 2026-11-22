import { dropDatabase } from "./environment.ts";

// Leave nothing behind: the run's accounts and posts go with its database.
export default function globalTeardown() {
  dropDatabase();
}
