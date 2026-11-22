import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { RegisterForm } from "@/features/auth/components/register-form";
import { safeRedirect } from "@/lib/redirect";
import { SITE_NAME } from "@/lib/site";

import { MarginRow } from "@/components/layout/margin-row";

export const Route = createFileRoute("/register")({
  validateSearch: (search) => ({ redirect: safeRedirect(search.redirect) }),
  beforeLoad: ({ context, search }) => {
    if (context.session.getStatus() === "in") {
      throw redirect({ href: search.redirect });
    }
  },
  head: () => ({ meta: [{ title: `Sign up, ${SITE_NAME}` }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const search = Route.useSearch();

  return (
    <MarginRow
      rail={
        <>
          <div>Already have an account?</div>
          <Link
            to="/login"
            search={search}
            className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            Log in
          </Link>
        </>
      }
    >
      <h1 className="text-4xl leading-none font-extrabold tracking-tighter sm:text-6xl">
        Sign up
      </h1>
      <p className="mt-4 mb-8 max-w-[52ch] font-serif text-lg">
        With an account you can comment and like. Writing posts is a permission
        an administrator gives.
      </p>
      <RegisterForm />
    </MarginRow>
  );
}
