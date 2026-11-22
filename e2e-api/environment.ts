import { execSync } from "node:child_process";

// What the real-API tests share with their config: where the API and the
// app run, which database they use, and how to reach into it.

export const WEB_PORT = 4174;
export const API_PORT = 8010;
export const DATABASE_NAME = "e2e_draftwork_web";

export const apiEnv = {
  DATABASE_NAME,
  // Development mode: the refresh cookie isn't marked Secure, so it works
  // over plain http, and passwords need eight characters, not twelve.
  FASTAPI_DEBUG: "true",
  // The API remembers the tag list for a minute. A test that publishes a
  // post and looks for its tag can't wait that long.
  FASTAPI_TAGS_CACHE_SECONDS: "0",
};

const inApi = "uv run --directory ../fastapi_blog";

// Refuses any database whose name doesn't start with "e2e_": the address
// comes from the API's own settings, and this must never drop a real one.
export const DROP_DATABASE = [
  `${inApi} python -c`,
  `"from pymongo import MongoClient;`,
  `from app.core.settings import get_settings;`,
  `s = get_settings();`,
  `assert s.database_name.startswith('e2e_'), s.database_name;`,
  `MongoClient(s.database_url.get_secret_value()).drop_database(s.database_name)"`,
].join(" ");

function run(command: string) {
  execSync(command, {
    env: { ...process.env, ...apiEnv },
    stdio: ["ignore", "ignore", "inherit"],
  });
}

export function dropDatabase() {
  run(DROP_DATABASE);
}

/**
 * Make an existing account an administrator, with the API's own seed
 * command. The only way in: nobody can give themselves a role through the
 * API, which is the point of it.
 */
export function promoteToAdmin(email: string) {
  // The addresses are made by these tests; still, nothing else may reach
  // the shell.
  if (!/^[\w.@+-]+$/.test(email)) throw new Error(`Unexpected email: ${email}`);
  run(`${inApi} python -m app.scripts.seed --email ${email} --promote`);
}
