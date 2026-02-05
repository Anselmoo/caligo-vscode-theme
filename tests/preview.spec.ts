import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { resolvePreviewPath } from "./helpers/resolvePreviewPath";

// The landing page (index.html) is curated. The full theme card grid lives in
// preview-original.html and is the stable target for DOM-based assertions. We
// support both legacy `build/preview/preview-original.html` and the modern
// `dist/index.html` (used by the Vue build). `resolvePreviewPath` chooses
// the right file at runtime.
const previewPath = resolvePreviewPath();
const previewUrl = pathToFileURL(previewPath).toString();

// 10 base seeds × 5 harmony modes = 50 themes
const EXPECTED_THEME_COUNT = 50;

test.describe("Preview HTML", () => {
  test("renders with correct title", async ({ page }) => {
    await page.goto(previewUrl);
    await expect(page).toHaveTitle(/Caligo Preview/i);
  });

  test("renders all theme cards", async ({ page }) => {
    await page.goto(previewUrl);

    const cards = page.locator("[data-theme-card]");
    const count = await cards.count();

    expect(count).toBe(EXPECTED_THEME_COUNT);
  });

  test("each card has a theme ID attribute", async ({ page }) => {
    await page.goto(previewUrl);

    const cards = page.locator("[data-theme-card]");
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toHaveAttribute("data-theme-id", /\w+/);
    }
  });

  test("displays all expected base theme names", async ({ page }) => {
    await page.goto(previewUrl);

    // Base theme names - each has 4 variants (base, Muted, Triadic, VibrantAAA)
    const baseThemes = [
      "Aurora Noir",
      "Cinder",
      "Deep Sable",
      "Eclipse",
      "Graphite Flux",
      "Mandarian",
      "Midnight Atelier",
      "Nebula Night",
      "Obsidian Glow",
      "Void Ember",
    ];

    for (const themeName of baseThemes) {
      // Headings include the base theme plus the active harmony mode, e.g.
      // "Aurora Noir — Balanced".
      const heading = page.getByRole("heading", { name: new RegExp(`^${themeName}\\b`) });
      await expect(heading).toBeVisible();
    }
  });

  test("each card displays contrast ratio", async ({ page }) => {
    await page.goto(previewUrl);

    const contrastLabels = page.locator("text=/contrast:/");
    const count = await contrastLabels.count();

    expect(count).toBe(EXPECTED_THEME_COUNT);

    // Verify contrast values are reasonable (> 4.5:1 for WCAG AA)
    for (let i = 0; i < count; i++) {
      const text = await contrastLabels.nth(i).textContent();
      const match = text?.match(/(\d+\.\d+):1/);
      expect(match).toBeTruthy();

      if (!match) throw new Error("Contrast label missing numeric ratio");
      const ratio = parseFloat(match[1]);
      expect(ratio).toBeGreaterThan(4.5);
    }
  });

  test("each card has TypeScript and Python sections", async ({ page }) => {
    await page.goto(previewUrl);

    // Each card has TypeScript and Python code preview sections
    const cards = page.locator("[data-theme-card]");
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      // Language tabs use compact labels in the grid preview.
      await expect(card.getByRole("button", { name: "TS" })).toBeVisible();
      await expect(card.getByRole("button", { name: "Py" })).toBeVisible();
    }
  });

  test("code preview contains syntax highlighting elements", async ({ page }) => {
    await page.goto(previewUrl);

    // Check for code keywords in preview
    const codePreview = page.locator("[data-theme-card]").first();

    await expect(codePreview).toContainText("function");
    await expect(codePreview).toContainText("export");
    await expect(codePreview).toContainText("return");
  });

  test("each card has harmony colors section", async ({ page }) => {
    await page.goto(previewUrl);

    // Each card has a Harmony Colors section with color swatches
    const harmonyElements = page.locator("text=Harmony Colors");
    const count = await harmonyElements.count();

    expect(count).toBe(EXPECTED_THEME_COUNT);
  });

  test("page has no console errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", msg => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(previewUrl);

    // Wait for page to fully load
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("theme cards have distinct theme IDs", async ({ page }) => {
    await page.goto(previewUrl);

    const cards = page.locator("[data-theme-card]");
    const themeIds: string[] = [];

    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const id = await cards.nth(i).getAttribute("data-theme-id");
      if (id) themeIds.push(id);
    }

    // All theme IDs should be unique
    const uniqueIds = new Set(themeIds);
    expect(uniqueIds.size).toBe(EXPECTED_THEME_COUNT);
  });
});
