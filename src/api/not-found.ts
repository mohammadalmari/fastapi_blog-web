import { notFound } from "@tanstack/react-router";

import { ApiError } from "@/api/errors";

/**
 * For a route's loader: turn the API's 404 into the "not found" page.
 *
 * The API answers 404 for something that never existed, something deleted
 * and something this reader may not see (someone else's draft), and the app
 * shows one page for all three for the same reason: a different page would
 * tell what became of it.
 *
 * A 422 is a malformed id or name in the address, which is as much "no
 * such page" to the reader.
 */
export async function orNotFound<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 422)
    ) {
      throw notFound();
    }
    throw error;
  }
}
