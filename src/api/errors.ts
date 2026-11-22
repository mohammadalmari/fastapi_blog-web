// One shape for every way a request can fail, so pages and forms handle
// errors the same way. The API answers `{"detail": "..."}`, or for invalid
// input (422) `{"detail": [{loc, msg, type}, ...]}`.

export type FieldErrors = Record<string, string[]>;

type ApiErrorInit = {
  status: number;
  message: string;
  fields?: FieldErrors;
  retryAfterSeconds?: number | null;
  requestId?: string | null;
};

export class ApiError extends Error {
  /** The HTTP status, or 0 when no response arrived at all. */
  readonly status: number;
  /** Messages per field for a 422, keyed like the form: "title", "tags.0". */
  readonly fields: FieldErrors;
  /** How long a 429 asks the caller to wait. */
  readonly retryAfterSeconds: number | null;
  /** The API's id for this request: what to quote when reporting a problem. */
  readonly requestId: string | null;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.fields = init.fields ?? {};
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
    this.requestId = init.requestId ?? null;
  }
}

const NO_RESPONSE =
  "Can't reach the server. Check your connection and try again.";
const INVALID_INPUT = "Some of what you entered needs another look.";
const SERVER_FAULT =
  "Something went wrong on the server. Try again in a moment.";
const TOO_OFTEN = "Too many attempts. Wait a little, then try again.";
const UNKNOWN = "The request couldn't be completed.";

// The first part of a 422's `loc` says where the value came from, not which
// field it is.
const LOCATIONS = new Set(["body", "query", "path", "header", "cookie"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fieldErrors(detail: unknown[]): FieldErrors {
  const fields: FieldErrors = {};
  for (const item of detail) {
    if (!isRecord(item) || typeof item.msg !== "string") continue;
    const loc = Array.isArray(item.loc) ? item.loc : [];
    const path = LOCATIONS.has(String(loc[0])) ? loc.slice(1) : loc;
    // A problem with the whole body has no field: it goes under "".
    const key = path.join(".");
    (fields[key] ??= []).push(item.msg);
  }
  return fields;
}

function retryAfter(response: Response): number | null {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}

export function toApiError(
  body: unknown,
  response: Response | undefined
): ApiError {
  if (body instanceof ApiError) return body;
  if (!response) return new ApiError({ status: 0, message: NO_RESPONSE });

  const status = response.status;
  const requestId = response.headers.get("X-Request-ID");
  const detail = isRecord(body) ? body.detail : undefined;

  if (Array.isArray(detail)) {
    return new ApiError({
      status,
      requestId,
      message: INVALID_INPUT,
      fields: fieldErrors(detail),
    });
  }

  let fallback = UNKNOWN;
  if (status === 429) fallback = TOO_OFTEN;
  else if (status >= 500) fallback = SERVER_FAULT;

  return new ApiError({
    status,
    requestId,
    message: typeof detail === "string" && detail ? detail : fallback,
    retryAfterSeconds: status === 429 ? retryAfter(response) : null,
  });
}

/** Whether asking again could help: not for a 4xx, which will answer the same. */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status === 0 || error.status >= 500;
}
