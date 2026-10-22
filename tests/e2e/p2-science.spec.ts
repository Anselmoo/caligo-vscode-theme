/**
 * Phase 2 acceptance: the Science page (/#/science).
 *
 * One readable report for the current theme: the lightness view and the OKLCH
 * view side by side (no tabs hiding either), an OKLCH table derived from each
 * colour's hex at runtime, and honest contrast for translucent colours.
 *
 * Why culori here: themes-manifest.json carries wrong OKLCH metadata for some
 * colours (in Deep Sable, `types` is #ce8545, L 0.68 by measurement, but the
 * manifest says L 0.92). The page must show what the hex actually is.
 *
 * No shipped core colour is translucent any more, so the compositing path is
 * exercised against a manifest served with a translucent `strings` (page.route).
 */

import { expect, type Page, test } from "@playwright/test";
import { blend, converter, wcagContrast } from "culori";
import {
  applyThemeViaPalette,
  expectThemeApplied,
  gotoApp,
  hueDistance,
  loadThemeManifest,
  type ThemeEntry,
  type ThemeManifest,
  themeByKey,
} from "./support/app";

const toOklch = converter("oklch");
const manifest = loadThemeManifest();
const defaultTheme = themeByKey(manifest, manifest.defaultThemeKey);

/** WCAG 2 ratio of a (possibly translucent) colour as it renders over `bg`. */
function renderedContrast(fg: string, bg: string): number {
  return wcagContrast(blend([bg, fg]), bg);
}

function row(page: Page, key: string) {
  return page.locator(`#main [data-oklch-row][data-color-key="${key}"]`);
}

async function expectOklchMatchesHex(page: Page, theme: ThemeEntry, key: string) {
  const hex = theme.colors[key as keyof ThemeEntry["colors"]];
  const truth = toOklch(hex);
  const cells = row(page, key);
  await expect(cells, `OKLCH row for ${key}`).toBeVisible();

  const l = Number(await cells.getAttribute("data-l"));
  const c = Number(await cells.getAttribute("data-c"));
  const h = Number(await cells.getAttribute("data-h"));
  expect(Math.abs(l - truth.l), `${key} ${hex}: L ${l} vs culori ${truth.l}`).toBeLessThanOrEqual(
    0.01
  );
  expect(Math.abs(c - truth.c), `${key} ${hex}: C ${c} vs culori ${truth.c}`).toBeLessThanOrEqual(
    0.01
  );
  if (truth.c >= 0.02 && truth.h !== undefined) {
    expect(
      hueDistance(h, truth.h),
      `${key} ${hex}: h ${h} vs culori ${truth.h}`
    ).toBeLessThanOrEqual(1);
  }
  await expect(cells, "the visible text shows L to two decimals").toContainText(truth.l.toFixed(2));
}

async function openScience(page: Page) {
  await gotoApp(page, "/#/science");
  await expect(page.locator("#main h1")).toBeVisible();
}

/**
 * Serve the real manifest, except that the default theme's `strings` (in `colors` and in
 * its matching `core` entry) is `hex`, a translucent #rrggbbaa value.
 */
async function serveTranslucentStrings(page: Page, hex: string) {
  await page.route("**/themes-manifest.json", async route => {
    const data = (await (await route.fetch()).json()) as ThemeManifest;
    const theme = data.themes[data.defaultThemeKey];
    theme.colors.strings = hex;
    for (const entry of theme.core) if (entry.key === "strings") entry.hex = hex;
    await route.fulfill({ json: data });
  });
}

test.describe("Science page: one report for the current theme", { tag: "@science" }, () => {
  test.beforeEach(async ({ page }) => {
    await openScience(page);
  });

  test("shows the lightness and OKLCH views together", async ({ page }) => {
    await expect(page.locator('#main [data-science-view="lightness"]')).toBeVisible();
    await expect(page.locator('#main [data-science-view="oklch"]')).toBeVisible();
  });

  test("names the theme it measures and follows theme changes", async ({ page }) => {
    const label = page.locator("#main [data-science-theme]");
    await expect(label).toContainText(defaultTheme.displayName);

    const next = themeByKey(manifest, "Caligo-EclipseTriadic");
    await applyThemeViaPalette(page, "eclipse triadic");
    await expectThemeApplied(page, next);
    await expect(label).toContainText(next.displayName);
    await expectOklchMatchesHex(page, next, "types");
  });

  test("lists every core colour of the theme", async ({ page }) => {
    for (const { key } of defaultTheme.core) {
      await expect(row(page, key), `row for ${key}`).toHaveCount(1);
    }
  });
});

test.describe("Science page: the contrast ladder", { tag: "@science" }, () => {
  const SURFACES = new Set(["bg0", "bg1", "bg2"]);
  const inkKeys = (theme: ThemeEntry) =>
    theme.core.map(c => c.key).filter(key => !SURFACES.has(key));
  const ladder = (page: Page) => page.locator('#main [data-science-view="contrast"]');

  test.beforeEach(async ({ page }) => {
    await openScience(page);
  });

  test("is the third view, beside the lightness and OKLCH views", async ({ page }) => {
    await expect(ladder(page)).toBeVisible();
    await expect(ladder(page).getByRole("heading", { level: 2 })).toBeVisible();
    await expect(page.locator("#main [data-science-view]")).toHaveCount(3);
  });

  test("draws one bar per ink and none for the surfaces", async ({ page }) => {
    const rows = ladder(page).locator("[data-ladder-row]");
    await expect(rows).toHaveCount(inkKeys(defaultTheme).length);
    for (const key of inkKeys(defaultTheme)) {
      await expect(ladder(page).locator(`[data-ladder-row="${key}"]`), key).toHaveCount(1);
    }
    for (const key of SURFACES) {
      await expect(ladder(page).locator(`[data-ladder-row="${key}"]`), key).toHaveCount(0);
    }
  });

  test("each bar's ratio is the WCAG contrast of that ink over the background", async ({
    page,
  }) => {
    const { bg0 } = defaultTheme.colors;
    for (const key of inkKeys(defaultTheme)) {
      const hex = defaultTheme.colors[key as keyof ThemeEntry["colors"]];
      const expected = renderedContrast(hex, bg0);
      const value = ladder(page).locator(`[data-ladder-row="${key}"] [data-ratio]`);
      const ratio = Number(await value.getAttribute("data-ratio"));
      expect(Math.abs(ratio - expected), `${key}: ${ratio} vs ${expected}`).toBeLessThanOrEqual(
        0.05
      );
      await expect(value).toContainText(expected.toFixed(1));
    }
  });

  test("lists the inks from clearest to faintest", async ({ page }) => {
    const ratios = (
      await ladder(page)
        .locator("[data-ladder-row] [data-ratio]")
        .evaluateAll(els => els.map(el => Number(el.getAttribute("data-ratio"))))
    ).map(Number);
    expect(ratios).toEqual([...ratios].sort((a, b) => b - a));
  });

  test("says in words which inks miss 4.5:1, and follows theme changes", async ({ page }) => {
    // Cinder's accent is the one ink in the family that misses 4.5:1 (3.1:1).
    const cinder = themeByKey(manifest, "Caligo-Cinder");
    await applyThemeViaPalette(page, "cinder balanced");
    await expectThemeApplied(page, cinder);
    const accent = ladder(page).locator('[data-ladder-row="accent"] [data-ratio]');
    await expect(accent).toContainText("below");
    await expect(ladder(page).locator("[data-contrast-summary]")).toContainText(
      /6 of 7 inks reach 4\.5:1/
    );
  });
});

test.describe("Science page: OKLCH comes from the hex, not the manifest", {
  tag: "@science",
}, () => {
  test.beforeEach(async ({ page }) => {
    await openScience(page);
  });

  for (const key of ["types", "keywords", "functions", "strings", "accent", "bg0"]) {
    test(`${key} matches culori's conversion of its hex within 0.01`, async ({ page }) => {
      await expectOklchMatchesHex(page, defaultTheme, key);
    });
  }
});

test.describe("Science page: honest contrast", { tag: "@science" }, () => {
  test("no shipped core colour is translucent", async () => {
    for (const theme of Object.values(manifest.themes)) {
      for (const [key, hex] of Object.entries(theme.colors)) {
        expect(hex, `${theme.key} ${key}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
      for (const { key, hex } of theme.core)
        expect(hex, `${theme.key} core ${key}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test("a translucent colour is reported after compositing over its background", async ({
    page,
  }) => {
    // 50% opaque: far enough from the opaque reading to tell the two apart.
    const strings = `${defaultTheme.colors.strings.slice(0, 7)}80`;
    const { bg0 } = defaultTheme.colors;
    await serveTranslucentStrings(page, strings);
    await openScience(page);

    const composited = renderedContrast(strings, bg0);
    const opaque = wcagContrast(strings, bg0);
    expect(
      Math.abs(opaque - composited),
      "the two readings differ enough to tell apart"
    ).toBeGreaterThan(0.5);

    const cell = page.locator('#main [data-contrast-key="strings"]');
    await expect(cell).toBeVisible();
    const ratio = Number(await cell.getAttribute("data-ratio"));
    expect(
      Math.abs(ratio - composited),
      `reported ${ratio}, composited ${composited}`
    ).toBeLessThanOrEqual(0.05);
    await expect(cell).toContainText(composited.toFixed(1));

    const alphaPercent = Math.round((toOklch(strings).alpha ?? 1) * 100);
    expect(alphaPercent).toBe(50);
    await expect(
      page.locator('#main [data-oklch-row][data-color-key="strings"]'),
      "the row says the colour is translucent"
    ).toContainText(new RegExp(`${alphaPercent}\\s?%`));
  });

  test("an opaque colour reports its plain contrast over the background", async ({ page }) => {
    await openScience(page);
    const { bg0, keywords } = defaultTheme.colors;
    const expected = renderedContrast(keywords, bg0);
    const cell = page.locator('#main [data-contrast-key="keywords"]');
    await expect(cell).toBeVisible();
    const ratio = Number(await cell.getAttribute("data-ratio"));
    expect(Math.abs(ratio - expected)).toBeLessThanOrEqual(0.05);
  });
});
