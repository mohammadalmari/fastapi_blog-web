// @vitest-environment node
import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS } from "./security-headers.ts";

describe("the pages' security headers", () => {
  const policy = SECURITY_HEADERS["Content-Security-Policy"];

  it("allow no inline script and no eval", () => {
    expect(policy).toMatch(/script-src 'self'(;|$)/);
    expect(policy).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline/);
  });

  it("refuse to be framed, and take nothing from another site but https images", () => {
    expect(policy).toMatch(/frame-ancestors 'none'/);
    expect(policy).toMatch(/default-src 'self'/);
    expect(policy).toMatch(/img-src 'self' https:(;|$)/);
    expect(policy).toMatch(/object-src 'none'/);
  });
});
