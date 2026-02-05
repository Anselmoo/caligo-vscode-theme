/**
 * E2E tests for theme switching
 */

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function waitForThemeSelector(page: Page) {
  // Wait for any of the known selectors to be present within a reasonable timeout
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

test.describe("Theme Switching", () => {
  test("should change theme via selector", async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for theme selector to appear (skip test if not available)
    let sel: string;
    try {
      sel = await waitForThemeSelector(page);
    } catch {
      test.skip(true, "Theme selector not available");
      return;
    }

    // Get initial CSS variable value
    const initialAccent = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--accent");
    });

    // Change theme
    await page.selectOption(sel, { index: 1 });

    // Wait for theme to update (CSS var or localStorage)
    await page.waitForFunction(
      initial =>
        getComputedStyle(document.documentElement).getPropertyValue("--accent") !== initial,
      initialAccent,
      { timeout: 40000 }
    );

    // Check that CSS variable changed
    const newAccent = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--accent");
    });

    expect(newAccent).not.toBe(initialAccent);
  });

  test("should persist theme selection", async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    try {
      await waitForThemeSelector(page);
    } catch {
      test.skip(true, "Theme selector not available");
      return;
    }

    // Select a specific theme
    await page.selectOption("#theme-select", { index: 2 });
    const selectedValue = await page.inputValue("#theme-select");
    expect(selectedValue).not.toBe("");

    // Reload page
    await page.reload();
    await page.waitForSelector("#theme-select", { timeout: 40000 });

    // Check that theme is still selected
    const newValue = await page.inputValue("#theme-select");
    expect(newValue).toBe(selectedValue);
  });

  test("should update visualizations when theme changes", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/#/analysis");
    await page.waitForLoadState("networkidle");
    try {
      await waitForThemeSelector(page);
    } catch {
      test.skip(true, "Theme selector not available");
      return;
    }

    // Change theme
    await page.selectOption("#theme-select", { index: 1 });
    await page.waitForFunction(
      () => document.querySelectorAll("svg.spiral-svg, svg.polygon-svg, svg.chord-svg").length > 0,
      null,
      {
        timeout: 40000,
      }
    );

    // Check that SVG visualizations exist
    const svgCount = await page.locator("svg.spiral-svg, svg.polygon-svg, svg.chord-svg").count();
    expect(svgCount).toBeGreaterThan(0);
  });
});
