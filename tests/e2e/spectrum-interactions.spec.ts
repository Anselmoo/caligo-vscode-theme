import { expect, test } from "@playwright/test";

test.describe("Spectrum basic UI", () => {
  test("renders compact color chips per cell", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".spectrum-head", { timeout: 40000 });

    // default mode should display chips
    const classAttr = await page.locator(".theme-spectrum").getAttribute("class");
    // class should include the component root
    expect(classAttr).toContain("theme-spectrum");

    const firstCell = page.locator(".spectrum-cell").first();
    const chips = await firstCell.locator(".chip").count();
    expect(chips).toBeGreaterThanOrEqual(6);
  });

  test("clicking a cell applies the theme (localStorage & CSS var)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".spectrum-head", { timeout: 40000 });

    const firstCell = page.locator(".spectrum-cell").first();
    await firstCell.click();

    // localStorage key should be set by the theme engine
    const key = await page.evaluate(() => localStorage.getItem("caligo-site-theme"));
    expect(key).not.toBeNull();

    // and at least one CSS var should change (syntax-accent)
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--syntax-accent")
    );
    expect(accent).toBeTruthy();
  });
});
