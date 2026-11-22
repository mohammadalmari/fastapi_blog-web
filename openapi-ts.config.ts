import { defineConfig } from "@hey-api/openapi-ts";

// The client is generated from openapi.json, which `bun run api:generate`
// exports from the API first. Both are committed, so a build needs neither
// the API's code nor a running server.
export default defineConfig({
  input: "./openapi.json",
  output: { path: "./src/api/generated" },
  plugins: [
    "@hey-api/client-fetch",
    "@hey-api/typescript",
    "@hey-api/sdk",
    // Query options and keys per operation, so no key is written by hand.
    "@tanstack/react-query",
  ],
});
