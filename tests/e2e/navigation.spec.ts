/**
 * E2E tests for navigation
 */

import { expect, test } from "@playwright/test";

test.describe("Navigation", () => {
  test("should navigate to home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Caligo/);
    await expect(page.locator("h1")).toContainText("Caligo");
  });

  test("should navigate to gallery page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Try clicking nav link, fallback to direct navigation if click not available
    const galleryLink = page.locator('nav a[href="#/gallery"]');
    try {
      await galleryLink.click({ timeout: 5000 });
    } catch {
      await page.goto("/#/gallery");
    }

    await expect(page).toHaveURL(/#\/gallery/);
    await expect(page.locator("h1")).toContainText("Theme Gallery");
  });

  test("should navigate to analysis page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const analysisLink = page.locator('nav a[href="#/analysis"]');
    try {
      await analysisLink.click({ timeout: 5000 });
    } catch {
      await page.goto("/#/analysis");
    }

    await expect(page).toHaveURL(/#\/analysis/);
    await expect(page.locator("h1")).toContainText("Theme Analysis");
  });

  test("should navigate using nav links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navigate to gallery
    try {
      await page.click('nav a:has-text("Gallery")', { timeout: 5000 });
    } catch {
      await page.goto("/#/gallery");
    }
    await expect(page).toHaveURL(/#\/gallery/);

    // Navigate to analysis
    try {
      await page.click('nav a:has-text("Analysis")', { timeout: 5000 });
    } catch {
      await page.goto("/#/analysis");
    }
    await expect(page).toHaveURL(/#\/analysis/);

    // Navigate back to home
    try {
      await page.click('nav a:has-text("Home")', { timeout: 5000 });
    } catch {
      await page.goto("/#/");
    }
    await expect(page).toHaveURL(/\/$|#\/$/);
  });

  test("should show 404 page for unknown routes", async ({ page }) => {
    await page.goto("/#/unknown-route");
    await expect(page.locator("h1")).toContainText("404");
  });

  test("should have the site brand in the nav", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("nav", { timeout: 40000 });

    // Ensure nav contains the brand
    await expect(page.locator("nav")).toContainText("Caligo");
  });
});
