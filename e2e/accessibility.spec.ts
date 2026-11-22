import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { PAGES, prepare } from "./pages.ts";

// Every page, checked by axe against WCAG 2.2 AA, in both themes. A finding
// fails the test and lists what and where.

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const { path, ready, loggedIn = false } of PAGES) {
      test(`${path} has no accessibility problems`, async ({ page }) => {
        // The pages are served under the production headers (vite
        // preview): anything the policy blocks is reported here.
        const blocked: string[] = [];
        page.on("console", (message) => {
          if (/Content.Security.Policy/i.test(message.text())) {
            blocked.push(message.text());
          }
        });
        page.on("pageerror", (error) => blocked.push(error.message));
        await prepare(page, loggedIn);

        await page.goto(path);
        await expect(
          page.getByRole("main").getByText(ready).first()
        ).toBeVisible();
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();

        const found = results.violations.map((violation) => ({
          rule: violation.id,
          impact: violation.impact,
          where: violation.nodes
            .slice(0, 3)
            .map((node) => `${node.target.join(" ")}: ${node.failureSummary}`),
        }));
        expect(found).toEqual([]);
        expect(blocked).toEqual([]);
      });
    }
  });
}
