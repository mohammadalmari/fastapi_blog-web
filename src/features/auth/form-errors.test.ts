import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/errors";

import { describeError, showErrorOnForm } from "./form-errors";

type Values = { email: string; password: string };
const FIELDS = ["email", "password"] as const;

describe("showErrorOnForm", () => {
  it("puts each problem under the field the API named", () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 422,
      message: "x",
      fields: { password: ["Too short.", "Too common."] },
    });

    showErrorOnForm<Values>(error, setError, FIELDS);

    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith("password", {
      message: "Too short. Too common.",
    });
  });

  it("shows a problem with a field the form doesn't have above the form", () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 422,
      message: "x",
      fields: { grant_type: ["Not allowed."] },
    });

    showErrorOnForm<Values>(error, setError, FIELDS);

    expect(setError).toHaveBeenCalledWith("root", { message: "Not allowed." });
  });

  it("shows the API's message above the form for anything else", () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 401,
      message: "Incorrect email, username or password",
    });

    showErrorOnForm<Values>(error, setError, FIELDS);

    expect(setError).toHaveBeenCalledWith("root", {
      message: "Incorrect email, username or password",
    });
  });
});

describe("describeError", () => {
  it.each([
    [30, "a minute"],
    [600, "10 minutes"],
    [601, "11 minutes"],
  ])("says how long a 429 asks to wait: %i seconds", (seconds, wait) => {
    const error = new ApiError({
      status: 429,
      message: "Too many requests",
      retryAfterSeconds: seconds,
    });

    expect(describeError(error)).toBe(
      `Too many attempts. Try again in ${wait}.`
    );
  });

  it("doesn't show the text of an error that isn't the API's", () => {
    expect(describeError(new TypeError("x is undefined"))).toBe(
      "Something went wrong. Try again."
    );
  });
});
