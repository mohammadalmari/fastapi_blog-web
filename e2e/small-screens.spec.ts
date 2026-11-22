import { expect, test } from "@playwright/test";

import { mockLoggedIn, mockReading, post } from "./mocks.ts";
import { PAGES, prepare } from "./pages.ts";

test.describe("on a phone", () => {
  // A small phone: narrower than most, so what fits here fits elsewhere.
  test.use({ viewport: { width: 360, height: 740 } });

  for (const { path, ready, loggedIn = false } of PAGES) {
    test(`${path} fits the width, with nothing to scroll sideways`, async ({
      page,
    }) => {
      await prepare(page, loggedIn);

      await page.goto(path);
      await expect(
        page.getByRole("main").getByText(ready).first()
      ).toBeVisible();

      const overflow = await page.evaluate(
        "document.documentElement.scrollWidth - window.innerWidth"
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("the links are behind a menu, which closes on the way to a page", async ({
    page,
  }) => {
    await mockReading(page, () => ({ items: [post(1)], next_cursor: null }));
    await mockLoggedIn(page);

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Tags" })).toBeHidden();
    await page.getByRole("button", { name: "Menu" }).click();

    const menu = page.getByRole("dialog");
    // Everything an administrator has, each a full-size target.
    for (const name of ["Posts", "Tags", "Write", "My posts", "Admin"]) {
      const link = menu.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    await menu.getByRole("link", { name: "Tags" }).click();

    await expect(page).toHaveURL(/\/tags$/);
    await expect(menu).toBeHidden();
    await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible();
  });
});

test("the keyboard's first stop skips the header and lands on the page", async ({
  page,
}) => {
  await mockReading(page, () => ({ items: [post(1)], next_cursor: null }));
  await page.goto("/");
  await expect(page.getByText("Post number 1")).toBeVisible();

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to the page" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  // The next Tab goes into the page, not back into the header.
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(
    "document.activeElement?.closest('main') !== null"
  );
  expect(focused).toBe(true);
});
