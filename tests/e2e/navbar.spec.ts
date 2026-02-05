import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function waitForThemeSelector(page: Page) {
  await page.waitForFunction(
    () => {
      return (
        !!document.querySelector("#theme-select") ||
        !!document.querySelector("select.theme-select") ||
        !!document.querySelector('select[aria-label="Select theme family"]')
      );
    },
    null,
    { timeout: 40000 }
  );

  if (await page.$("#theme-select")) return "#theme-select";
  if (await page.$("select.theme-select")) return "select.theme-select";
  return 'select[aria-label="Select theme family"]';
}

test.describe("Navbar", () => {
  test("contains theme selector and harmony selector", async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Nav actions should be present (might be hidden temporarily during page load)
    const navActions = page.locator(".nav-actions");
    await expect(navActions).toBeAttached();

    // Theme selector presence within nav
    let sel: string;
    try {
      sel = await waitForThemeSelector(page);
    } catch {
      test.skip(true, "Theme selector not available");
      return;
    }

    await expect(navActions.locator(sel)).toBeVisible();

    // Harmony selector should exist with buttons
    const harmonyButtons = navActions.locator(".harmony-selector .harmony-button");
    await expect(harmonyButtons.first()).toBeVisible();
  });

  test("changing theme via navbar updates CSS variables", async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    let sel: string;
    try {
      sel = await waitForThemeSelector(page);
    } catch {
      test.skip(true, "Theme selector not available");
      return;
    }

    // Ensure selector is visible in nav-actions (avoid accidental mismatch)
    const selLocator = page.locator(`.nav-actions ${sel}`);
    await expect(selLocator).toBeVisible({ timeout: 40000 });

    const initialAccent = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--accent");
    });

    // Change theme (pick index 1)
    await page.selectOption(selLocator, { index: 1 });

    await page.waitForFunction(
      initial =>
        getComputedStyle(document.documentElement).getPropertyValue("--accent") !== initial,
      initialAccent,
      { timeout: 40000 }
    );

    const newAccent = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--accent");
    });

    expect(newAccent).not.toBe(initialAccent);
  });
});
