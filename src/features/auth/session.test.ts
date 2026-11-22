import { describe, expect, it, vi } from "vitest";

import type { SessionDeps, SessionMessage } from "./session";
import { createSession } from "./session";

/** A promise that the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** One browser: tabs made from it share a lock, a channel and storage. */
function browser() {
  let hint = false;
  let queue: Promise<unknown> = Promise.resolve();
  const tabs: Array<(message: SessionMessage) => void> = [];

  function tab(requestRefresh: SessionDeps["requestRefresh"]) {
    let hear: (message: SessionMessage) => void = () => {};
    const posted: SessionMessage[] = [];
    const session = createSession({
      requestRefresh,
      // Like the Web Locks API: one holder at a time, in order of asking.
      lock: (work) => {
        const turn = queue.then(work);
        queue = turn.catch(() => {});
        return turn;
      },
      // Like BroadcastChannel: every tab but the sender hears it.
      post: (message) => {
        posted.push(message);
        for (const other of tabs) if (other !== hear) other(message);
      },
      listen: (handler) => {
        hear = handler;
        tabs.push(handler);
      },
      hint: { get: () => hint, set: (value) => (hint = value) },
    });
    return { session, posted };
  }

  return {
    tab,
    setHint: (value: boolean) => (hint = value),
    getHint: () => hint,
  };
}

describe("starting up", () => {
  it("restores the session from the refresh cookie", async () => {
    const one = browser();
    one.setHint(true);
    const { session } = one.tab(async () => "token-1");

    await session.ready();

    expect(session.getStatus()).toBe("in");
    expect(session.getToken()).toBe("token-1");
  });

  it("asks the server nothing when this browser never logged in", async () => {
    const requestRefresh = vi.fn(async () => "token-1");
    const { session } = browser().tab(requestRefresh);

    await session.ready();

    expect(requestRefresh).not.toHaveBeenCalled();
    expect(session.getStatus()).toBe("out");
  });

  it("is logged out when the server no longer accepts the cookie", async () => {
    const one = browser();
    one.setHint(true);
    const { session } = one.tab(async () => null);

    await session.ready();

    expect(session.getStatus()).toBe("out");
    expect(one.getHint()).toBe(false);
  });

  it("loads as a visitor when the server can't be reached, and keeps the hint", async () => {
    const one = browser();
    one.setHint(true);
    const { session } = one.tab(async () => {
      throw new Error("offline");
    });

    await session.ready();

    expect(session.getStatus()).toBe("out");
    expect(one.getHint()).toBe(true);
  });

  it("restores only once however often it is asked", async () => {
    const one = browser();
    one.setHint(true);
    const requestRefresh = vi.fn(async () => "token-1");
    const { session } = one.tab(requestRefresh);

    await Promise.all([session.ready(), session.ready(), session.ready()]);

    expect(requestRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("renewing a refused token", () => {
  it("makes one request for any number of callers at once", async () => {
    const pending = deferred<string | null>();
    const requestRefresh = vi.fn(() => pending.promise);
    const { session } = browser().tab(requestRefresh);
    session.login("old");

    const renewals = [
      session.renew("old"),
      session.renew("old"),
      session.renew("old"),
    ];
    pending.resolve("new");

    expect(await Promise.all(renewals)).toEqual(["new", "new", "new"]);
    expect(requestRefresh).toHaveBeenCalledTimes(1);
  });

  it("hands over the current token when the stale one was already replaced", async () => {
    const requestRefresh = vi.fn(async () => "newer");
    const { session } = browser().tab(requestRefresh);
    session.login("new");

    const token = await session.renew("old");

    expect(token).toBe("new");
    expect(requestRefresh).not.toHaveBeenCalled();
  });

  it("ends the session when the server refuses the cookie", async () => {
    const { session } = browser().tab(async () => null);
    session.login("old");

    const token = await session.renew("old");

    expect(token).toBeNull();
    expect(session.getStatus()).toBe("out");
  });

  it("keeps the session when the server can't be reached", async () => {
    const { session } = browser().tab(async () => {
      throw new Error("offline");
    });
    session.login("old");

    const token = await session.renew("old");

    expect(token).toBeNull();
    expect(session.getStatus()).toBe("in");
  });

  it("can try again after a failed attempt", async () => {
    const requestRefresh = vi
      .fn<SessionDeps["requestRefresh"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("new");
    const { session } = browser().tab(requestRefresh);
    session.login("old");

    await session.renew("old");
    const token = await session.renew("old");

    expect(token).toBe("new");
  });
});

describe("two tabs", () => {
  // The attack this guards against is our own: the API ends a session whose
  // refresh cookie is used twice, so two tabs must never both spend it.
  it("spend the refresh cookie once when both find their token expired", async () => {
    const one = browser();
    const pending = deferred<string | null>();
    const refreshA = vi.fn(() => pending.promise);
    const refreshB = vi.fn(async () => "from-b");
    const a = one.tab(refreshA).session;
    const b = one.tab(refreshB).session;
    a.login("old");

    const renewals = [a.renew("old"), b.renew("old")];
    pending.resolve("new");

    expect(await Promise.all(renewals)).toEqual(["new", "new"]);
    expect(refreshA).toHaveBeenCalledTimes(1);
    expect(refreshB).not.toHaveBeenCalled();
  });

  it("are both logged in after one logs in", () => {
    const one = browser();
    const a = one.tab(async () => null).session;
    const b = one.tab(async () => null).session;

    a.login("token-1");

    expect(b.getStatus()).toBe("in");
    expect(b.getToken()).toBe("token-1");
  });

  it("are both logged out after one logs out", () => {
    const one = browser();
    const a = one.tab(async () => null).session;
    const b = one.tab(async () => null).session;
    a.login("token-1");

    b.logout();

    expect(a.getStatus()).toBe("out");
    expect(a.getToken()).toBeNull();
    expect(one.getHint()).toBe(false);
  });

  it("don't echo what they hear back to each other", () => {
    const one = browser();
    const a = one.tab(async () => null);
    const b = one.tab(async () => null);

    a.session.login("token-1");

    expect(a.posted).toEqual([{ type: "token", token: "token-1" }]);
    expect(b.posted).toEqual([]);
  });
});

describe("subscribers", () => {
  it("are told of every change until they unsubscribe", () => {
    const { session } = browser().tab(async () => null);
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    session.login("token-1");
    session.logout();
    unsubscribe();
    session.login("token-2");

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
