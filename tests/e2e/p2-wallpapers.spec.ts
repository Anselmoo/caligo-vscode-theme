/**
 * Phase 2 acceptance: the Wallpapers page (/#/wallpapers).
 *
 * Wallpapers are built in CI and never committed, so locally the manifest is
 * missing: the Vite dev server answers /wallpapers-manifest.json with its HTML
 * fallback (status 200), and a static host answers 404. Both must lead to a
 * plain-language empty state, never a raw JSON parse error.
 *
 * The populated grid is tested against a mocked manifest: it must show the
 * build-time thumbnails and never load a full wallpaper SVG.
 */

import type { Page, Route } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { gotoApp } from "./support/app";

const RAW_ERROR = /Unexpected token|SyntaxError|not valid JSON|HTTP \d{3}|Failed to fetch/i;

/** 1x1 transparent PNG; browsers sniff the bytes, so it also serves .webp requests. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

const SEEDS = [
  { id: "AuroraNoir", name: "Aurora Noir" },
  { id: "Eclipse", name: "Eclipse" },
];
const MODES = [
  { id: "none", folder: "balanced", label: "Balanced", topic: "Balanced" },
  { id: "triadic", folder: "triadic", label: "Triadic", topic: "Triadic" },
];
const PLATFORMS = ["monitor", "tablet", "mobile"] as const;
const TEXT_VARIANTS = ["no-text", "text"] as const;

type MockOptions = { dropThumbFor?: string };

function mockManifest({ dropThumbFor }: MockOptions = {}) {
  const entries = SEEDS.flatMap(seed =>
    MODES.flatMap(mode =>
      PLATFORMS.flatMap(platform =>
        TEXT_VARIANTS.map(textVariant => {
          const stem = `wallpapers/${seed.id}/${mode.folder}/${platform}${textVariant === "text" ? "-text" : ""}`;
          const entry: Record<string, string> = {
            seedId: seed.id,
            seedDisplayName: seed.name,
            harmonyMode: mode.id,
            harmonyLabel: mode.label,
            topic: mode.topic,
            platform,
            textVariant,
            displayName: `${seed.name} · ${mode.topic}`,
            svgPath: `${stem}.svg`,
            pngPath: `${stem}.png`,
            thumbPath: `${stem}.webp`,
          };
          if (dropThumbFor === `${seed.id}|${mode.id}`) delete entry.thumbPath;
          return entry;
        })
      )
    )
  );
  return { total: entries.length, entries };
}

/** Serve a mocked manifest and tiny wallpaper assets; returns every wallpaper asset URL requested. */
async function serveWallpapers(page: Page, options: MockOptions = {}): Promise<string[]> {
  const requested: string[] = [];
  await page.route("**/wallpapers-manifest.json", route =>
    route.fulfill({ json: mockManifest(options) })
  );
  // Match on the pathname only: Vite module URLs such as
  // /src/vue-app/components/wallpapers/... must pass through untouched.
  await page.route(
    url => url.pathname.startsWith("/wallpapers/"),
    (route: Route) => {
      const url = route.request().url();
      requested.push(url);
      if (url.endsWith(".svg")) {
        return route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
        });
      }
      return route.fulfill({ contentType: "image/png", body: PIXEL });
    }
  );
  return requested;
}

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
  test("shows one thumbnail card per scene and never loads a full SVG", async ({ page }) => {
    const requested = await serveWallpapers(page);
    await gotoApp(page, "/#/wallpapers");

    const cards = page.locator("#main [data-wallpaper-card]");
    await expect(cards).toHaveCount(SEEDS.length * MODES.length);

    const sources = await cards
      .locator("img")
      .evaluateAll(imgs =>
        imgs.map(img => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src)
      );
    expect(sources.length).toBeGreaterThanOrEqual(SEEDS.length * MODES.length);
    for (const src of sources) expect(src, "grid images are thumbnails").toMatch(/\.webp$/);

    await page.waitForLoadState("networkidle");
    expect(
      requested.filter(url => url.endsWith(".svg")),
      "no full wallpaper SVG is fetched for the grid"
    ).toEqual([]);

    for (const card of await cards.all()) {
      const fullFile = card.locator('a[href$=".svg"], a[href$=".png"]');
      await expect(fullFile.first(), "each card links to the full-size file").toBeAttached();
    }
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

  test("filters by theme and by mode", async ({ page }) => {
    await serveWallpapers(page);
    await gotoApp(page, "/#/wallpapers");

    const cards = page.locator("#main [data-wallpaper-card]");
    await expect(cards).toHaveCount(4);

    await page.locator("#main").getByLabel("Theme", { exact: true }).selectOption("Eclipse");
    await expect(cards).toHaveCount(2);
    for (const card of await cards.all()) await expect(card).toContainText("Eclipse");

    await page.locator("#main").getByLabel("Mode", { exact: true }).selectOption("triadic");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("Triadic");
  });

  test("shows a placeholder, not the full SVG, when a thumbnail is missing", async ({ page }) => {
    const requested = await serveWallpapers(page, { dropThumbFor: "Eclipse|triadic" });
    await gotoApp(page, "/#/wallpapers");

    await expect(page.locator("#main [data-wallpaper-card]")).toHaveCount(4);
    await page.waitForLoadState("networkidle");
    expect(requested.filter(url => url.endsWith(".svg"))).toEqual([]);
  });
});
