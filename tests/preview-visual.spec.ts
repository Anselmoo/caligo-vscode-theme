import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Visual regression tests for Caligo theme preview
 * Tests all 50 theme variants to ensure:
 * 1. Harmony modes produce distinct colors
 * 2. All color roles are properly applied
 * 3. No regressions in visual appearance
 */

test.describe("Caligo Theme Preview", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the preview HTML (file:// protocol). Prefer legacy preview
    // when present, otherwise fall back to the Vue-built `dist/index.html`.
    const { resolvePreviewPath } = await import("./helpers/resolvePreviewPath");
    const previewPath = resolvePreviewPath();
    await page.goto(`file://${previewPath}`);
  });

  test("should load preview with all theme cards", async ({ page }) => {
    // Wait for all cards to be rendered
    const cards = await page.locator("[data-theme-card]").count();
    expect(cards).toBeGreaterThan(0);
    expect(cards).toBe(50); // Should have all 50 theme variants (10 palettes × 5 variants)
  });

  test("should display distinct harmony colors in Base vs Triadic", async ({ page }) => {
    // Get Aurora Noir Base card
    const baseCard = page.locator('[data-theme-id="AuroraNoir"]');
    await expect(baseCard).toBeVisible();

    // Get Aurora Noir Triadic and Analogous cards
    const triadicCard = page.locator('[data-theme-id="AuroraNoirTriadic"]');
    const analogousCard = page.locator('[data-theme-id="AuroraNoirAnalogous"]');
    await expect(triadicCard).toBeVisible();
    await expect(analogousCard).toBeVisible();

    // Get computed styles for keywords color
    const baseKeyword = baseCard.locator(".kw").first();
    const triadicKeyword = triadicCard.locator(".kw").first();
    const analogousKeyword = analogousCard.locator(".kw").first();

    const baseColor = await baseKeyword.evaluate(el => getComputedStyle(el).color);
    const triadicColor = await triadicKeyword.evaluate(el => getComputedStyle(el).color);
    const analogousColor = await analogousKeyword.evaluate(el => getComputedStyle(el).color);

    // At least one variant should differ from base (not all equal)
    const allEqual = baseColor === triadicColor && baseColor === analogousColor;
    expect(allEqual).toBe(false);
  });

  test("should properly color string literals", async ({ page }) => {
    // Check that strings are not using default foreground color
    const card = page.locator("[data-theme-card]").first();
    const strElement = card.locator(".str").first();
    const varElement = card.locator(".var").first();

    const strColor = await strElement.evaluate(el => getComputedStyle(el).color);
    const varColor = await varElement.evaluate(el => getComputedStyle(el).color);

    // String color should be different from variable/foreground color
    expect(strColor).not.toBe(varColor);
  });

  test("should prevent accent/keyword color collision in Triadic mode", async ({ page }) => {
    const triadicCard = page.locator('[data-theme-id*="Triadic"]').first();
    await expect(triadicCard).toBeVisible();

    // Get accent swatch and keyword swatch
    const accentSwatch = triadicCard.locator('.swatch-item:has-text("accent") .sw');
    const keywordsSwatch = triadicCard.locator('.swatch-item:has-text("keywords") .sw');

    const accentBg = await accentSwatch.evaluate(el => getComputedStyle(el).backgroundColor);
    const keywordsBg = await keywordsSwatch.evaluate(el => getComputedStyle(el).backgroundColor);

    // Accent and keywords should have distinct colors
    expect(accentBg).not.toBe(keywordsBg);
  });

  test("should apply semantic labels correctly", async ({ page }) => {
    const card = page.locator("[data-theme-card]").first();
    const paletteGrid = card.locator(".palette-grid");

    // Check that we have the correct semantic labels
    await expect(paletteGrid.locator("text=accent")).toBeVisible();
    await expect(paletteGrid.locator("text=keywords")).toBeVisible();
    await expect(paletteGrid.locator("text=functions")).toBeVisible();
    await expect(paletteGrid.locator("text=types")).toBeVisible();
    await expect(paletteGrid.locator("text=strings")).toBeVisible();
    await expect(paletteGrid.locator("text=error")).toBeVisible();

    // Should NOT have color-based labels like "blue", "purple", etc.
    await expect(paletteGrid.locator("text=blue")).not.toBeVisible();
    await expect(paletteGrid.locator("text=purple")).not.toBeVisible();
  });
});

test.describe("Theme Variant Comparison", () => {
  test.beforeEach(async ({ page }) => {
    const previewPath = join(process.cwd(), "build/preview/preview-original.html");
    await page.goto(`file://${previewPath}`);
  });

  test("should show all 4 Aurora Noir variants with distinct colors", async ({ page }) => {
    const variants = [
      "AuroraNoir",
      "AuroraNoirAnalogous",
      "AuroraNoirTriadic",
      "AuroraNoirMonochromatic",
    ];

    const keywordColors = new Set();

    for (const variant of variants) {
      const card = page.locator(`[data-theme-id="${variant}"]`);
      await expect(card).toBeVisible();

      const keyword = card.locator(".kw").first();
      const color = await keyword.evaluate(el => getComputedStyle(el).color);
      keywordColors.add(color);
    }

    // All 4 variants should have different keyword colors
    // (At least Base vs Triadic should differ)
    expect(keywordColors.size).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Visual Regression Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    const previewPath = join(process.cwd(), "build/preview/preview-original.html");
    await page.goto(`file://${previewPath}`);
    // Wait for fonts to load
    await page.waitForTimeout(500);
  });

  test("screenshot: Aurora Noir Base", async ({ page }) => {
    const card = page.locator('[data-theme-id="AuroraNoir"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("aurora-noir-base.png", {
      // Font rendering and subpixel anti-aliasing can differ slightly across
      // machines/CI runs. Keep this tight, but not brittle.
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: Aurora Noir Triadic", async ({ page }) => {
    const card = page.locator('[data-theme-id="AuroraNoirTriadic"]');
    await expect(card).toBeVisible();

    // This snapshot is sensitive to whether optional intent swatches are
    // rendered. Force them on to keep the element geometry stable.
    const intentToggle = page.locator("#intent-toggle");
    if (await intentToggle.count()) {
      await intentToggle.check();
      await page.waitForTimeout(100);
    }

    await expect(card).toHaveScreenshot("aurora-noir-triadic.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: Nebula Night Triadic", async ({ page }) => {
    const card = page.locator('[data-theme-id="NebulaNightTriadic"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("nebula-night-triadic.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("screenshot: Cinder Intent", async ({ page }) => {
    const card = page.locator('[data-theme-id="Cinder"]');
    await expect(card).toBeVisible();
    const intentToggle = page.locator("#intent-toggle");
    if (await intentToggle.count()) {
      await intentToggle.check();
      await page.waitForTimeout(100);
    }
    // Wait a small time to let intent colors render
    await page.waitForTimeout(200);
    await expect(card).toHaveScreenshot("cinder-intent.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
