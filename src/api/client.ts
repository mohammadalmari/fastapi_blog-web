import type { ApiError } from "@/api/errors";
import { toApiError } from "@/api/errors";
import { client } from "@/api/generated/client.gen";
import { authRefresh } from "@/api/generated/sdk.gen";
import { createAuthFetch } from "@/features/auth/auth-fetch";
import type { Session } from "@/features/auth/session";
import { browserSessionDeps, createSession } from "@/features/auth/session";

// Every query and mutation fails with an ApiError, so nothing has to guess
// what was thrown.
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

async function requestRefresh(): Promise<string | null> {
  const { data, error, response } = await authRefresh();
  if (data) return data.access_token;
  // 401: no cookie, or one the API no longer accepts. The session is over.
  if (response?.status === 401) return null;
  throw toApiError(error, response);
}

let session: Session | null = null;

/** Set the API client up and return the session. Safe to call twice. */
export function setupApiClient(): Session {
  if (session) return session;
  session = createSession({ ...browserSessionDeps(), requestRefresh });

  // No base URL: requests go to this page's own origin (see vite.config.ts).
  client.setConfig({ fetch: createAuthFetch(session) });
  client.interceptors.error.use((error, response) =>
    toApiError(error, response)
  );
  return session;
}
