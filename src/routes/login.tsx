import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { LoginForm } from "@/features/auth/components/login-form";
import { safeRedirect } from "@/lib/redirect";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";

export const Route = createFileRoute("/login")({
  validateSearch: (search) => ({ redirect: safeRedirect(search.redirect) }),
  // Also what moves the page on after a successful login: the session
  // invalidates the router, and this runs again.
  beforeLoad: ({ context, search }) => {
    if (context.session.getStatus() === "in") {
      throw redirect({ href: search.redirect });
    }
  },
  head: () => ({ meta: [{ title: `Log in, ${SITE_NAME}` }] }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();

  return (
    <MarginRow
      rail={
        <>
          <div>No account yet?</div>
          <Link
            to="/register"
            search={search}
            className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            Sign up
          </Link>
        </>
      }
    >
      <h1 className="mb-8 text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
        Log in
      </h1>
      <LoginForm />
    </MarginRow>
  );
}
