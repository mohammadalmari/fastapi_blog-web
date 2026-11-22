import { describe, expect, it, vi } from "vitest";

import { createAuthFetch } from "./auth-fetch";
import type { Session } from "./session";

const ORIGIN = "http://localhost";

function sessionWith(token: string | null, renewed: string | null = null) {
  return {
    getToken: () => token,
    renew: vi.fn(async () => renewed),
  } as unknown as Session & { renew: ReturnType<typeof vi.fn> };
}

/** A server that answers each request with the next status in the list. */
function server(...statuses: number[]) {
  const seen: Request[] = [];
  const baseFetch = vi.fn(async (input: RequestInfo | URL) => {
    seen.push(input as Request);
    return new Response(null, { status: statuses[seen.length - 1] ?? 200 });
  }) as unknown as typeof fetch;
  return { baseFetch, seen };
}

const authorization = (request: Request) =>
  request.headers.get("Authorization");

describe("createAuthFetch", () => {
  it("sends the access token to the API", async () => {
    const { baseFetch, seen } = server(200);
    const authFetch = createAuthFetch(sessionWith("token-1"), baseFetch);

    await authFetch(`${ORIGIN}/api/v1/users/me`);

    expect(authorization(seen[0])).toBe("Bearer token-1");
  });

  it("sends no token for a visitor", async () => {
    const { baseFetch, seen } = server(200);
    const authFetch = createAuthFetch(sessionWith(null), baseFetch);

    await authFetch(`${ORIGIN}/api/v1/tags`);

    expect(authorization(seen[0])).toBeNull();
  });

  it("keeps the token away from anything that isn't the API", async () => {
    const { baseFetch, seen } = server(200);
    const authFetch = createAuthFetch(sessionWith("token-1"), baseFetch);

    await authFetch(`${ORIGIN}/media/avatars/abc.webp`);

    expect(authorization(seen[0])).toBeNull();
  });

  it("renews a refused token and sends the request once more", async () => {
    const { baseFetch, seen } = server(401, 200);
    const session = sessionWith("old", "new");
    const authFetch = createAuthFetch(session, baseFetch);

    const response = await authFetch(`${ORIGIN}/api/v1/users/me`);

    expect(response.status).toBe(200);
    expect(session.renew).toHaveBeenCalledWith("old");
    expect(seen.map(authorization)).toEqual(["Bearer old", "Bearer new"]);
  });

  it("sends the body again on the second try", async () => {
    const { baseFetch, seen } = server(401, 201);
    const authFetch = createAuthFetch(sessionWith("old", "new"), baseFetch);

    await authFetch(`${ORIGIN}/api/v1/posts`, {
      method: "POST",
      body: JSON.stringify({ title: "Hello" }),
    });

    expect(await seen[1].json()).toEqual({ title: "Hello" });
  });

  it("tries only once more, whatever the answer", async () => {
    const { baseFetch, seen } = server(401, 401);
    const authFetch = createAuthFetch(sessionWith("old", "new"), baseFetch);

    const response = await authFetch(`${ORIGIN}/api/v1/users/me`);

    expect(response.status).toBe(401);
    expect(seen).toHaveLength(2);
  });

  it("asks again as a visitor when the session is over", async () => {
    const { baseFetch, seen } = server(401, 200);
    const authFetch = createAuthFetch(sessionWith("old", null), baseFetch);

    const response = await authFetch(`${ORIGIN}/api/v1/posts`);

    expect(response.status).toBe(200);
    expect(authorization(seen[1])).toBeNull();
  });

  it("passes a visitor's 401 through without asking for a token", async () => {
    const { baseFetch, seen } = server(401);
    const session = sessionWith(null);
    const authFetch = createAuthFetch(session, baseFetch);

    const response = await authFetch(`${ORIGIN}/api/v1/users/me`);

    expect(response.status).toBe(401);
    expect(session.renew).not.toHaveBeenCalled();
    expect(seen).toHaveLength(1);
  });

  it.each(["login", "register", "refresh", "logout"])(
    "treats a 401 from /auth/%s as the answer",
    async (route) => {
      const { baseFetch, seen } = server(401);
      const session = sessionWith("old", "new");
      const authFetch = createAuthFetch(session, baseFetch);

      const response = await authFetch(`${ORIGIN}/api/v1/auth/${route}`, {
        method: "POST",
      });

      expect(response.status).toBe(401);
      expect(session.renew).not.toHaveBeenCalled();
      expect(seen).toHaveLength(1);
    }
  );

  it("does renew for /auth/logout-all, which needs the access token", async () => {
    const { baseFetch } = server(401, 204);
    const session = sessionWith("old", "new");
    const authFetch = createAuthFetch(session, baseFetch);

    const response = await authFetch(`${ORIGIN}/api/v1/auth/logout-all`, {
      method: "POST",
    });

    expect(response.status).toBe(204);
  });
});
