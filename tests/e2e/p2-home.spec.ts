/**
 * Home page sections below the hero: "Why it reads" (the bento) and the wallpaper strip.
 * Both follow the selected theme; the strip is a scroll region that keyboard users can reach.
 */

import { expect, test } from "@playwright/test";
import { applyThemeViaPalette, gotoApp, loadThemeManifest, themeByKey } from "./support/app";
import { serveWallpapers } from "./support/wallpapers";

const manifest = loadThemeManifest();
const eclipseTriadic = themeByKey(manifest, "Caligo-EclipseTriadic");

test.describe("Home: Why it reads", { tag: "@shell" }, () => {
  test("shows four measured tiles for the selected theme", async ({ page }) => {
    await gotoApp(page, "/");
    const bento = page.getByRole("region", { name: "Why it reads" });
    await expect(bento.getByRole("heading", { level: 3 })).toHaveText([
      "Readable for hours",
      "One palette, five moods",
      "Placed in OKLCH",
      /one family, \d+ nights/,
    ]);
    await expect(bento.locator(".tile__figure")).toHaveText(/^\d+\.\d:1$/);
    await expect(bento.locator(".mood")).toHaveCount(5);
    await expect(bento.locator(".matrix i")).toHaveCount(manifest.seeds.length * 5);
  });

  test("re-reads the numbers when the theme changes", async ({ page }) => {
    await gotoApp(page, "/");
    const figure = page.locator(".tile__figure");
    await expect(figure).toBeVisible();
    const before = await figure.textContent();
    await applyThemeViaPalette(page, eclipseTriadic.displayName);
    await expect(page.locator(".mood.is-current")).toContainText(eclipseTriadic.harmonyLabel);
    await expect(page.locator(".tile--contrast .tile__body")).toContainText(
      eclipseTriadic.displayName
    );
    expect(await figure.textContent()).toMatch(/^\d+\.\d:1$/);
    expect(before).toMatch(/^\d+\.\d:1$/);
  });
});

test.describe("Home: wallpaper strip", { tag: "@shell" }, () => {
  test("lists the five moods of the palette, thumbnails only, and is keyboard-scrollable", async ({
    page,
  }) => {
    const requested = await serveWallpapers(page);
    await gotoApp(page, "/");
    const strip = page.getByRole("region", { name: "Every mood has its own night" });
    await expect(strip.locator(".scene-card")).toHaveCount(5);

    const rail = page.getByRole("region", { name: /scrollable/ });
    await rail.focus();
    await expect(rail).toBeFocused();

    await page.waitForLoadState("networkidle");
    expect(requested.filter(url => url.endsWith(".svg"))).toEqual([]);
  });

  test("links on to the full Wallpapers page", async ({ page }) => {
    await gotoApp(page, "/");
    await page.getByRole("link", { name: "Browse all wallpapers" }).click();
    await expect(page.locator("#main h1")).toHaveText("Wallpapers");
  });
});
