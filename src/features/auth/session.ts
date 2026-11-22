// Who is logged in, as far as this tab knows.
//
// The access token is kept in memory only: a script injected into the page
// could read anything in localStorage, and a token there would outlive the
// tab. A reload starts with no token and trades the refresh cookie (which
// scripts can't read) for a new one.
//
// The API lets each refresh cookie be used once, and treats a second use as
// theft: it ends the session. Two tabs refreshing at the same moment would
// do exactly that, so tabs take turns (a lock) and tell each other the
// result (a channel): the tab that waited uses the token it was told about
// and never spends the cookie the first tab just replaced.

/** "unknown" until the first attempt to restore a session has finished. */
export type SessionStatus = "unknown" | "in" | "out";

export type SessionMessage = { type: "token"; token: string } | { type: "out" };

export type SessionDeps = {
  /**
   * Trade the refresh cookie for an access token. Null when the server says
   * there is no session; throws when it couldn't be asked.
   */
  requestRefresh: () => Promise<string | null>;
  /** Run `work` while no other tab is running its own. */
  lock: <T>(work: () => Promise<T>) => Promise<T>;
  /** Tell the other tabs. */
  post: (message: SessionMessage) => void;
  /** Hear from the other tabs. */
  listen: (handler: (message: SessionMessage) => void) => void;
  /**
   * Whether this browser logged in and hasn't logged out: a hint only, so a
   * visitor's every page load doesn't start with a refresh that must fail.
   */
  hint: { get: () => boolean; set: (loggedIn: boolean) => void };
};

export type Session = ReturnType<typeof createSession>;

export function createSession(deps: SessionDeps) {
  let token: string | null = null;
  let status: SessionStatus = "unknown";
  let refreshing: Promise<string | null> | null = null;
  let starting: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function set(next: string | null, tellOthers: boolean) {
    token = next;
    status = next ? "in" : "out";
    if (tellOthers) {
      deps.hint.set(next !== null);
      deps.post(next ? { type: "token", token: next } : { type: "out" });
    }
    for (const listener of listeners) listener();
  }

  deps.listen((message) => {
    set(message.type === "token" ? message.token : null, false);
  });

  function refresh(): Promise<string | null> {
    // Every caller in this tab shares one attempt.
    refreshing ??= (async () => {
      const before = token;
      try {
        return await deps.lock(async () => {
          // Another tab finished while this one waited for its turn.
          if (token !== before) return token;
          const next = await deps.requestRefresh();
          set(next, true);
          return next;
        });
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  return {
    getToken: () => token,
    getStatus: () => status,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Restore the session, once. Resolves when the status is known. */
    ready(): Promise<void> {
      starting ??= (async () => {
        if (status !== "unknown") return;
        if (!deps.hint.get()) return set(null, false);
        try {
          await refresh();
        } catch {
          // The server couldn't be asked. Nothing proves a session, so the
          // page loads as a visitor's; the hint stays for the next load.
          if (status === "unknown") set(null, false);
        }
      })();
      return starting;
    },

    /**
     * Get a token to replace `stale`, which the API just refused. Null when
     * the session is over or the server couldn't be asked.
     */
    async renew(stale: string): Promise<string | null> {
      // Another request already replaced it.
      if (token !== stale) return token;
      try {
        return await refresh();
      } catch {
        return null;
      }
    },

    login(accessToken: string) {
      set(accessToken, true);
    },

    logout() {
      set(null, true);
    },
  };
}

const LOCK_NAME = "draftwork-session-refresh";
const CHANNEL_NAME = "draftwork-session";
const HINT_KEY = "draftwork.logged-in";

/** The parts of a session that only a browser has. */
export function browserSessionDeps(): Omit<SessionDeps, "requestRefresh"> {
  // Both are in every current browser; without them a tab simply works
  // alone, as it would have before.
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(CHANNEL_NAME);

  return {
    lock: (work) =>
      navigator.locks ? navigator.locks.request(LOCK_NAME, work) : work(),
    post: (message) => channel?.postMessage(message),
    listen: (handler) => {
      channel?.addEventListener("message", (event) => handler(event.data));
    },
    hint: {
      // Storage can be blocked (private windows, strict settings); the app
      // must still work, only without remembering the hint.
      get: () => {
        try {
          return localStorage.getItem(HINT_KEY) === "1";
        } catch {
          return false;
        }
      },
      set: (loggedIn) => {
        try {
          if (loggedIn) localStorage.setItem(HINT_KEY, "1");
          else localStorage.removeItem(HINT_KEY);
        } catch {
          // Nothing to do: see above.
        }
      },
    },
  };
}
