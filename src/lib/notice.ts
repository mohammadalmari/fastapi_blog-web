// A sentence for the login page to show once, set by a page that is about
// to send the reader there: "Your password was changed", for instance. The
// session's guards do the sending and know nothing of why; this carries
// the why across. In memory only: a reload forgets it, which is right.

let waiting: string | null = null;

export function leaveLoginNotice(message: string) {
  waiting = message;
}

/** The notice, if one is waiting; it is gone afterwards. */
export function takeLoginNotice(): string | null {
  const message = waiting;
  waiting = null;
  return message;
}
