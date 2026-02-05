/**
 * Single theme test for quick validation
 */

import fs from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOTS_DIR = join(process.cwd(), "tests/screenshots/output");
// Use the full theme card grid for element-based screenshots.
const { resolvePreviewPath } = await import("../helpers/resolvePreviewPath");
const PREVIEW_PATH = resolvePreviewPath();

test.beforeAll(async () => {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
});

test("should capture Cinder theme screenshot", async ({ page }) => {
  // Navigate to preview
  await page.goto(`file://${PREVIEW_PATH}`);
  await page.waitForLoadState("networkidle");

  // Find Cinder theme card
  const card = page.locator('[data-theme-id="Cinder"]');
  await expect(card).toBeVisible();

  // Scroll into view
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  // Capture screenshot
  await card.screenshot({
    path: join(SCREENSHOTS_DIR, "test-cinder.png"),
  });

  console.log("✅ Screenshot saved to tests/screenshots/output/test-cinder.png");
});

test("should capture overview of all themes", async ({ page }) => {
  await page.goto(`file://${PREVIEW_PATH}`);
  await page.waitForLoadState("networkidle");

  // Wait for first card to be visible
  const firstCard = page.locator("[data-theme-card]").first();
  await expect(firstCard).toBeVisible();

  // Full page screenshot
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, "test-overview.png"),
    fullPage: true,
  });

  console.log("✅ Overview screenshot saved to tests/screenshots/output/test-overview.png");
});
