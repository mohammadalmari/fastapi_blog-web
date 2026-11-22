import { test as base } from "@playwright/test";

// Every test arrives from an address of its own, as different visitors do.
//
// The API limits logins (30 in five minutes) and sign-ups (10 an hour) per
// address, and a whole run from one address goes over. The test API trusts
// the address its proxy forwards (`--forwarded-allow-ips 127.0.0.1` in
// playwright.api.config.ts, as behind a real proxy), and these headers set
// it. Nothing here weakens a limit: each address still has the API's whole
// allowance and no more.

function hash(text: string): number {
  let value = 0;
  for (const character of text) {
    value = (value * 31 + character.charCodeAt(0)) >>> 0;
  }
  return value;
}

/** A private address, the same every run for the same name and number. */
export function addressFor(name: string, number = 0) {
  const value = hash(name);
  const address = `10.${number % 256}.${(value >>> 8) & 255}.${value & 255 || 1}`;
  return { "X-Forwarded-For": address };
}

export const test = base.extend<{
  /** Headers for one more visitor in this test: a second browser, say. */
  visitor: () => Record<string, string>;
}>({
  // Playwright reads a fixture's needs from its first parameter, which must
  // be written as an object pattern even when it needs nothing.
  // eslint-disable-next-line no-empty-pattern
  extraHTTPHeaders: async ({}, provide, testInfo) => {
    await provide(addressFor(testInfo.testId));
  },
  // eslint-disable-next-line no-empty-pattern
  visitor: async ({}, provide, testInfo) => {
    let count = 0;
    await provide(() => {
      count += 1;
      return addressFor(testInfo.testId, count);
    });
  },
});

export { expect } from "@playwright/test";
