import { createFileRoute, redirect } from "@tanstack/react-router";

// Every route in the _authenticated folder needs a login. A visitor is sent
// to log in and brought back to the address they asked for.
//
// This is navigation, not protection: the API refuses a request without a
// valid token whatever the page shows.
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    if (context.session.getStatus() !== "in") {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
});
