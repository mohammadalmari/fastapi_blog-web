import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";

import { ApiError } from "@/api/errors";

import { MarginRow } from "@/components/layout/margin-row";

import { Button } from "@/components/ui/button";

const UNEXPECTED = "This page hit a problem it didn't expect.";

/** Shown in place of a page whose loader or component threw. */
export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrors = useQueryErrorResetBoundary();
  const apiError = error instanceof ApiError ? error : null;

  const retry = () => {
    // The failed query is remembered as failed until it is reset, and the
    // route until it is invalidated: without both, "try again" shows the
    // same error without asking the server.
    queryErrors.reset();
    reset();
    void router.invalidate();
  };

  return (
    <MarginRow
      rail={
        apiError?.requestId ? (
          <>
            <div>Request id</div>
            <div className="font-semibold break-all text-foreground">
              {apiError.requestId}
            </div>
          </>
        ) : null
      }
    >
      <h1 className="max-w-[20ch] text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
        That didn&apos;t load
      </h1>
      <p role="alert" className="mt-4 max-w-[60ch] font-serif text-lg">
        {apiError ? apiError.message : UNEXPECTED}
      </p>
      {apiError?.requestId ? (
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          If it keeps happening, quote the request id when you report it.
        </p>
      ) : null}
      <Button size="lg" className="mt-6" onClick={retry}>
        Try again
      </Button>
    </MarginRow>
  );
}
