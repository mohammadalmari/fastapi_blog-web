import { describe, expect, it } from "vitest";

import { ApiError, isRetryable, toApiError } from "./errors";

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(null, { status, headers });
}

describe("toApiError", () => {
  it("uses the API's own message for a plain error", () => {
    const body = { detail: "Incorrect email, username or password" };

    const error = toApiError(body, response(401));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.message).toBe("Incorrect email, username or password");
    expect(error.fields).toEqual({});
  });

  it("groups a 422's problems by field, without the 'body' prefix", () => {
    const body = {
      detail: [
        { loc: ["body", "title"], msg: "Field required", type: "missing" },
        { loc: ["body", "tags", 0], msg: "Too long", type: "string_too_long" },
        { loc: ["body", "tags", 0], msg: "Not allowed", type: "value_error" },
        { loc: ["query", "limit"], msg: "Too big", type: "less_than_equal" },
      ],
    };

    const error = toApiError(body, response(422));

    expect(error.status).toBe(422);
    expect(error.fields).toEqual({
      title: ["Field required"],
      "tags.0": ["Too long", "Not allowed"],
      limit: ["Too big"],
    });
  });

  it("files a problem with the whole body under the empty key", () => {
    const body = {
      detail: [{ loc: ["body"], msg: "Invalid JSON", type: "json_invalid" }],
    };

    const error = toApiError(body, response(422));

    expect(error.fields).toEqual({ "": ["Invalid JSON"] });
  });

  it("reads how long a 429 asks to wait", () => {
    const body = { detail: "Too many requests" };

    const error = toApiError(body, response(429, { "Retry-After": "42" }));

    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(42);
  });

  it("ignores Retry-After on anything but a 429", () => {
    const error = toApiError({}, response(503, { "Retry-After": "42" }));

    expect(error.retryAfterSeconds).toBeNull();
  });

  it("keeps the request id for reporting", () => {
    const error = toApiError({}, response(500, { "X-Request-ID": "abc-123" }));

    expect(error.requestId).toBe("abc-123");
  });

  it("explains a server fault when the body says nothing usable", () => {
    const error = toApiError("<html>Bad Gateway</html>", response(502));

    expect(error.message).toMatch(/went wrong on the server/);
  });

  it("reports status 0 when no response arrived", () => {
    const error = toApiError(new TypeError("Failed to fetch"), undefined);

    expect(error.status).toBe(0);
    expect(error.message).toMatch(/reach the server/);
  });

  it("passes an ApiError through unchanged", () => {
    const original = new ApiError({ status: 404, message: "Not found" });

    expect(toApiError(original, response(500))).toBe(original);
  });
});

describe("isRetryable", () => {
  it.each([
    [0, true],
    [500, true],
    [503, true],
    [400, false],
    [404, false],
    [429, false],
  ])("status %i -> %s", (status, expected) => {
    const error = new ApiError({ status, message: "x" });

    expect(isRetryable(error)).toBe(expected);
  });

  it("retries an error that isn't from the API", () => {
    expect(isRetryable(new Error("boom"))).toBe(true);
  });
});
