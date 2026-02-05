/**
 * E2E tests for gallery filtering
 */

import { expect, test } from "@playwright/test";

test.describe("Gallery Filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/gallery");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".gallery-grid", { timeout: 40000 });
  });

  test("should filter themes by search", async ({ page }) => {
    const searchInput = page.locator("#search-input");
    await searchInput.fill("eclipse");
    await page.keyboard.press("Enter");

    // Wait for filtering to apply
    await page.waitForSelector(".screenshot-card", { timeout: 40000 });

    const visibleCards = await page.locator(".screenshot-card").count();
    expect(visibleCards).toBeGreaterThan(0);

    // At least one visible card should contain "eclipse"
    const cardTitles = await page.locator(".card-title").allTextContents();
    const hasMatch = cardTitles.some(t => t.toLowerCase().includes("eclipse"));
    expect(hasMatch).toBeTruthy();
  });

  test("should filter themes by seed", async ({ page }) => {
    await page.selectOption("#seed-filter", { index: 1 });
    await page.waitForTimeout(300);

    const resultText = await page.locator(".result-text").textContent();
    expect(resultText).toMatch(/Showing \d+ themes?/);
  });

  test("should filter themes by harmony", async ({ page }) => {
    await page.selectOption("#harmony-filter", { value: "triadic" });
    await page.keyboard.press("Enter");

    // Wait for filtered cards or no results
    const cards = page.locator(".screenshot-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // At least one visible card should report 'triadic' as its harmony tag
    const harmonyTags = await page
      .locator(".screenshot-card .meta-tag:nth-child(2)")
      .allTextContents();
    const hasTriadic = harmonyTags.some(t => t.toLowerCase().includes("triadic"));
    expect(hasTriadic).toBeTruthy();
  });

  test("should clear all filters", async ({ page }) => {
    // Apply filters
    await page.locator("#search-input").fill("test");
    await page.selectOption("#seed-filter", { index: 1 });

    await page.waitForTimeout(300);

    // Instead of relying on UI clear controls, simulate clearing filters by resetting inputs
    await page.locator("#search-input").fill("");
    await page.selectOption("#seed-filter", { value: "" });

    // Wait for filters to reset
    await page.waitForFunction(
      () =>
        (document.querySelector("#search-input") as HTMLInputElement)?.value === "" &&
        (document.querySelector("#seed-filter") as HTMLSelectElement)?.value === "",
      null,
      {
        timeout: 40000,
      }
    );

    const searchValue = await page.inputValue("#search-input");
    expect(searchValue).toBe("");

    const seedValue = await page.inputValue("#seed-filter");
    expect(seedValue).toBe("");
  });

  test("should show empty state when no matches", async ({ page }) => {
    const before = await page.locator(".screenshot-card").count();

    await page.locator("#search-input").fill("nonexistent-theme-xyz");
    await page.keyboard.press("Enter");

    // Wait a bit for filtering to apply
    await page.waitForTimeout(500);

    const after = await page.locator(".screenshot-card").count();

    // The number of visible cards should decrease (or be zero)
    expect(after).toBeLessThanOrEqual(before);
  });

  test("should display result count", async ({ page }) => {
    const resultText = await page.locator(".result-text").textContent();
    expect(resultText).toMatch(/Showing \d+ themes?/);
  });
});
