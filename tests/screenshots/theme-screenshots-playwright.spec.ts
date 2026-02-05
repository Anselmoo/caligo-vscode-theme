/**
 * Theme Screenshot Tests using Playwright
 *
 * This approach uses the generated static preview HTML to capture screenshots
 * of each theme variant.
 */

import fs from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOTS_DIR = join(process.cwd(), "tests/screenshots/output");
// Use the card-grid preview for stable selectors and per-theme screenshots.
const { resolvePreviewPath } = await import("../helpers/resolvePreviewPath");
const PREVIEW_PATH = resolvePreviewPath();

// All 50 theme variants (10 palettes × 5 harmony modes)
const THEMES = [
  "AuroraNoir",
  "AuroraNoirAnalogous",
  "AuroraNoirMonochromatic",
  "AuroraNoirSplitComplementary",
  "AuroraNoirTriadic",
  "Cinder",
  "CinderAnalogous",
  "CinderMonochromatic",
  "CinderSplitComplementary",
  "CinderTriadic",
  "DeepSable",
  "DeepSableAnalogous",
  "DeepSableMonochromatic",
  "DeepSableSplitComplementary",
  "DeepSableTriadic",
  "Eclipse",
  "EclipseAnalogous",
  "EclipseMonochromatic",
  "EclipseSplitComplementary",
  "EclipseTriadic",
  "GraphiteFlux",
  "GraphiteFluxAnalogous",
  "GraphiteFluxMonochromatic",
  "GraphiteFluxSplitComplementary",
  "GraphiteFluxTriadic",
  "Mandarian",
  "MandarianAnalogous",
  "MandarianMonochromatic",
  "MandarianSplitComplementary",
  "MandarianTriadic",
  "MidnightAtelier",
  "MidnightAtelierAnalogous",
  "MidnightAtelierMonochromatic",
  "MidnightAtelierSplitComplementary",
  "MidnightAtelierTriadic",
  "NebulaNight",
  "NebulaNightAnalogous",
  "NebulaNightMonochromatic",
  "NebulaNightSplitComplementary",
  "NebulaNightTriadic",
  "ObsidianGlow",
  "ObsidianGlowAnalogous",
  "ObsidianGlowMonochromatic",
  "ObsidianGlowSplitComplementary",
  "ObsidianGlowTriadic",
  "VoidEmber",
  "VoidEmberAnalogous",
  "VoidEmberMonochromatic",
  "VoidEmberSplitComplementary",
  "VoidEmberTriadic",
];

test.beforeAll(async () => {
  // Ensure screenshots directory exists
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
});

test.describe("Theme Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the preview HTML
    await page.goto(`file://${PREVIEW_PATH}`);
    await page.waitForLoadState("networkidle");
  });

  test("should generate overview screenshot with all themes", async ({ page }) => {
    // Wait for all theme cards to load
    const cards = page.locator("[data-theme-card]");
    await expect(cards.first()).toBeVisible();

    // Take full-page screenshot showing all themes
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, "caligo-all-themes-overview.png"),
      fullPage: true,
    });
  });

  for (const themeId of THEMES) {
    test(`should capture ${themeId} theme card`, async ({ page }) => {
      // Find the specific theme card
      const card = page.locator(`[data-theme-id="${themeId}"]`);
      await expect(card).toBeVisible();

      // Scroll card into view
      await card.scrollIntoViewIfNeeded();

      // Wait a bit for rendering
      await page.waitForTimeout(100);

      // Take screenshot of just this card
      await card.screenshot({
        path: join(SCREENSHOTS_DIR, `${themeId}-card.png`),
      });
    });
  }

  test.describe("Language-specific code samples", () => {
    const languages = [
      { name: "python", selector: ".language-python" },
      { name: "typescript", selector: ".language-typescript" },
      { name: "rust", selector: ".language-rust" },
      { name: "java", selector: ".language-java" },
    ];

    for (const themeId of THEMES.slice(0, 10)) {
      // Just base variants for samples
      for (const lang of languages) {
        test(`should capture ${themeId} ${lang.name} code sample`, async ({ page }) => {
          const card = page.locator(`[data-theme-id="${themeId}"]`);
          await expect(card).toBeVisible();

          // Find the code sample within this card
          const codeBlock = card.locator(lang.selector).first();

          if ((await codeBlock.count()) > 0) {
            await codeBlock.scrollIntoViewIfNeeded();
            await page.waitForTimeout(100);

            await codeBlock.screenshot({
              path: join(SCREENSHOTS_DIR, `${themeId}-${lang.name}.png`),
            });
          }
        });
      }
    }
  });

  test("should capture color palette comparison", async ({ page }) => {
    // Get first few theme cards for side-by-side comparison
    const baseThemes = ["Cinder", "Eclipse", "AuroraNoir", "Mandarian"];

    for (const themeId of baseThemes) {
      const card = page.locator(`[data-theme-id="${themeId}"]`);
      await expect(card).toBeVisible();

      // Find the palette grid within the card
      const paletteGrid = card.locator('.palette-grid, .swatches, [class*="swatch"]').first();

      if ((await paletteGrid.count()) > 0) {
        await paletteGrid.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);

        await paletteGrid.screenshot({
          path: join(SCREENSHOTS_DIR, `${themeId}-palette.png`),
        });
      }
    }
  });
});
