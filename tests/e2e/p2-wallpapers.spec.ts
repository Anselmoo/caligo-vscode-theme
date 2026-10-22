/**
 * Phase 2 acceptance: the Wallpapers page (/#/wallpapers).
 *
 * Wallpapers are built in CI and never committed, so locally the manifest is
 * missing: the Vite dev server answers /wallpapers-manifest.json with its HTML
 * fallback (status 200), and a static host answers 404. Both must lead to a
 * plain-language empty state, never a raw JSON parse error.
 *
 * The populated grid is tested against a mocked manifest (support/wallpapers.ts): by
 * default it shows the active theme's palette (a scope switch widens it to "All"),
 * with the build-time thumbnails, and never loads a full wallpaper SVG.
 */

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { applyThemeViaPalette, gotoApp, loadThemeManifest, themeByKey } from "./support/app";
import { DEFAULT_SEED, MODES, OTHER_SEED, SEEDS, serveWallpapers } from "./support/wallpapers";

const RAW_ERROR = /Unexpected token|SyntaxError|not valid JSON|HTTP \d{3}|Failed to fetch/i;

const manifest = loadThemeManifest();
const otherTheme = themeByKey(manifest, `Caligo-${OTHER_SEED.id}Triadic`);
const SCENES_PER_PALETTE = MODES.length;
const SCENES_IN_FAMILY = SEEDS.length * MODES.length;

async function expectPlainEmptyState(page: Page) {
  const empty = page.locator("#main [data-wallpapers-empty]");
  await expect(empty).toBeVisible();
  await expect(empty).toContainText("npm run wallpapers:all");
  await expect(page.locator("#main")).not.toContainText(RAW_ERROR);
  await expect(page.locator("#main [data-wallpaper-card]")).toHaveCount(0);
}

test.describe("Wallpapers page: no wallpapers built yet", { tag: "@wallpapers" }, () => {
  test("explains how to create them when the manifest is a 404", async ({ page }) => {
    await page.route("**/wallpapers-manifest.json", route =>
      route.fulfill({ status: 404, contentType: "text/plain", body: "Not Found" })
    );
    await gotoApp(page, "/#/wallpapers");
    await expect(page.locator("#main h1")).toBeVisible();
    await expectPlainEmptyState(page);
  });

  test("explains how to create them when the server returns its HTML fallback", async ({
    page,
  }) => {
    await page.route("**/wallpapers-manifest.json", route =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<!doctype html><html><body><div id="app"></div></body></html>',
      })
    );
    await gotoApp(page, "/#/wallpapers");
    await expect(page.locator("#main h1")).toBeVisible();
    await expectPlainEmptyState(page);
  });
});

test.describe("Wallpapers page: populated grid (mocked manifest)", { tag: "@wallpapers" }, () => {
  test("shows the active palette's thumbnail cards and never loads a full SVG", async ({
    page,
  }) => {
    const requested = await serveWallpapers(page);
    await gotoApp(page, "/#/wallpapers");

    const cards = page.locator("#main [data-wallpaper-card]");
    await expect(cards).toHaveCount(SCENES_PER_PALETTE);

    const sources = await cards
      .locator("img")
      .evaluateAll(imgs =>
        imgs.map(img => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src)
      );
    expect(sources.length).toBeGreaterThanOrEqual(SCENES_PER_PALETTE);
    for (const src of sources) expect(src, "grid images are thumbnails").toMatch(/\.webp$/);

    await page.waitForLoadState("networkidle");
    expect(
      requested.filter(url => url.endsWith(".svg")),
      "no full wallpaper SVG is fetched for the grid"
    ).toEqual([]);

    for (const card of await cards.all()) {
      const fullFile = card.locator('a[href$=".svg"]');
      await expect(fullFile.first(), "each card links to the full-size SVG").toBeAttached();
      await expect(card.getByRole("button", { name: /^PNG/ })).toBeVisible();
    }
  });

  test("shows only the active palette by default; All shows every scene", async ({ page }) => {
    await serveWallpapers(page);
    await gotoApp(page, "/#/wallpapers");

    const cards = page.locator("#main [data-wallpaper-card]");
    const scope = page.locator("#main [data-scope-toggle]");
    const palette = scope.getByRole("button", { name: DEFAULT_SEED.name, exact: true });
    const all = scope.getByRole("button", { name: `All ${SCENES_IN_FAMILY}`, exact: true });
    await expect(scope.getByRole("button")).toHaveCount(2);

    await expect(palette, "the active palette is the default scope").toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(all).toHaveAttribute("aria-pressed", "false");
    await expect(cards).toHaveCount(SCENES_PER_PALETTE);
    for (const card of await cards.all()) await expect(card).toContainText(DEFAULT_SEED.name);
    await expect(page.locator("#main")).toContainText(`${SCENES_PER_PALETTE} scenes for Monitor`);

    await all.click();
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(palette).toHaveAttribute("aria-pressed", "false");
    await expect(cards).toHaveCount(SCENES_IN_FAMILY);
    await expect(page.locator("#main")).toContainText(`${SCENES_IN_FAMILY} scenes for Monitor`);
    for (const seed of SEEDS) {
      await expect(cards.filter({ hasText: seed.name })).toHaveCount(MODES.length);
    }

    await palette.click();
    await expect(cards).toHaveCount(SCENES_PER_PALETTE);
  });

  test("changing the theme changes the palette shown", async ({ page }) => {
    await serveWallpapers(page);
    await gotoApp(page, "/#/wallpapers");

    const cards = page.locator("#main [data-wallpaper-card]");
    await expect(cards).toHaveCount(SCENES_PER_PALETTE);
    await expect(cards.first()).toContainText(DEFAULT_SEED.name);

    await applyThemeViaPalette(page, `${otherTheme.seedLabel} ${otherTheme.harmonyLabel}`);

    const scope = page.locator("#main [data-scope-toggle]");
    await expect(
      scope.getByRole("button", { name: otherTheme.seedLabel, exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(cards).toHaveCount(SCENES_PER_PALETTE);
    for (const card of await cards.all()) await expect(card).toContainText(OTHER_SEED.name);
    await expect(page.locator("#main")).not.toContainText(DEFAULT_SEED.name);
  });

  test("platform is the main toggle and switches every card", async ({ page }) => {
    const requested = await serveWallpapers(page);
    await gotoApp(page, "/#/wallpapers");

    const toggle = page.locator("#main [data-platform-toggle]");
    const monitor = toggle.getByRole("button", { name: "Monitor", exact: true });
    const tablet = toggle.getByRole("button", { name: "Tablet", exact: true });
    const mobile = toggle.getByRole("button", { name: "Mobile", exact: true });
    await expect(monitor).toHaveAttribute("aria-pressed", "true");
    await expect(tablet).toHaveAttribute("aria-pressed", "false");

    await mobile.click();
    await expect(mobile).toHaveAttribute("aria-pressed", "true");
    await expect(monitor).toHaveAttribute("aria-pressed", "false");

    const images = page.locator("#main [data-wallpaper-card] img");
    await expect(images).toHaveCount(SCENES_PER_PALETTE);
    await expect
      .poll(() =>
        images.evaluateAll(imgs => imgs.map(img => (img as HTMLImageElement).getAttribute("src")))
      )
      .toEqual(expect.arrayContaining([expect.stringMatching(/mobile\.webp$/)]));
    const srcs = await images.evaluateAll(imgs =>
      imgs.map(img => (img as HTMLImageElement).getAttribute("src") ?? "")
    );
    for (const src of srcs) expect(src).toMatch(/\/mobile\.webp$/);

    await page.waitForLoadState("networkidle");
    expect(requested.filter(url => url.endsWith(".svg"))).toEqual([]);
  });

  test("shows a placeholder, not the full SVG, when a thumbnail is missing", async ({ page }) => {
    const requested = await serveWallpapers(page, {
      dropThumbFor: `${DEFAULT_SEED.id}|triadic`,
    });
    await gotoApp(page, "/#/wallpapers");

    const cards = page.locator("#main [data-wallpaper-card]");
    await expect(cards).toHaveCount(SCENES_PER_PALETTE);
    const missing = cards.filter({ hasText: "Triadic" });
    await expect(missing).toHaveCount(1);
    await expect(missing).toContainText("Preview not built yet");
    await expect(missing.locator("img")).toHaveCount(0);
    await expect(
      cards.filter({ hasText: "Balanced" }).locator("img"),
      "the other scene keeps its thumbnail"
    ).toHaveCount(1);

    await page.waitForLoadState("networkidle");
    expect(requested.filter(url => url.endsWith(".svg"))).toEqual([]);
  });

  test("shows a placeholder under All too, for a scene of another palette", async ({ page }) => {
    const requested = await serveWallpapers(page, { dropThumbFor: `${OTHER_SEED.id}|triadic` });
    await gotoApp(page, "/#/wallpapers");

    await page
      .locator("#main [data-scope-toggle]")
      .getByRole("button", { name: `All ${SCENES_IN_FAMILY}`, exact: true })
      .click();
    const cards = page.locator("#main [data-wallpaper-card]");
    await expect(cards).toHaveCount(SCENES_IN_FAMILY);
    await expect(cards.filter({ hasText: "Preview not built yet" })).toHaveCount(1);

    await page.waitForLoadState("networkidle");
    expect(requested.filter(url => url.endsWith(".svg"))).toEqual([]);
  });
});
