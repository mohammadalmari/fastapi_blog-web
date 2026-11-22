import type { ApiError } from "@/api/errors";
import { toApiError } from "@/api/errors";
import { client } from "@/api/generated/client.gen";

// Every query and mutation fails with an ApiError, so nothing has to guess
// what was thrown.
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

let ready = false;

/** Call once, before the first request. */
export function setupApiClient() {
  if (ready) return;
  ready = true;
  // No base URL: requests go to this page's own origin (see vite.config.ts).
  client.interceptors.error.use((error, response) =>
    toApiError(error, response)
  );
}
