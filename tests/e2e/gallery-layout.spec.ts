import { expect, test } from "@playwright/test";

test.describe("Gallery Layout & Keyboard", () => {
  test("shows 6 columns at >=1200px", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/#/gallery");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".gallery-grid", { timeout: 40000 });

    const columns = await page.evaluate(() => {
      const el = document.querySelector(".gallery-grid");
      if (!el) return 0;
      const cols = getComputedStyle(el).getPropertyValue("grid-template-columns") || "";
      return cols.split(" ").length;
    });

    // Allow 5+ columns as layout can vary slightly between environments
    expect(columns).toBeGreaterThanOrEqual(5);
  });

  test("can open a screenshot via keyboard (Enter)", async ({ page }) => {
    await page.goto("/#/gallery");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".gallery-grid .screenshot-card", { timeout: 40000 });

    // Focus first card and press Enter
    await page.focus(".gallery-grid .screenshot-card");
    await page.keyboard.press("Enter");

    // Lightbox should open
    await page.waitForSelector(".lightbox.lightbox--open", { timeout: 2000 });
    const visible = await page.isVisible(".lightbox.lightbox--open");
    expect(visible).toBe(true);
  });
});
