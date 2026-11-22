import type { Session } from "@/features/auth/session";

const API_PREFIX = "/api/";

// A 401 from these is an answer, not an expired token: wrong password, no
// refresh cookie. Asking for a new token and trying again would be wrong,
// and for /refresh itself would never end.
const NEVER_RETRIED = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
]);

function withToken(request: Request, token: string | null) {
  if (!token) return request;
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(request, { headers });
}

/**
 * `fetch` for the API client: sends the access token, and when the API
 * refuses it (it lives fifteen minutes) gets a new one and sends the request
 * once more. The caller never sees the first 401.
 */
export function createAuthFetch(
  session: Session,
  baseFetch: typeof fetch = fetch
): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const path = new URL(request.url).pathname;
    if (!path.startsWith(API_PREFIX)) return baseFetch(request);

    const token = session.getToken();
    // A request's body can be read once; the copy is for the second try.
    const response = await baseFetch(withToken(request.clone(), token));

    if (response.status !== 401 || !token || NEVER_RETRIED.has(path)) {
      return response;
    }

    // With no new token the request goes out as a visitor's: a public page
    // still loads, and a private one answers the 401 the caller should see.
    const renewed = await session.renew(token);
    return baseFetch(withToken(request, renewed));
  };
}
