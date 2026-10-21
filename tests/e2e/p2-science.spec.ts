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

test.beforeEach(async ({ page }) => {
  await gotoApp(page, "/#/science");
  await expect(page.locator("#main h1")).toBeVisible();
});

test.describe("Science page: one report for the current theme", { tag: "@science" }, () => {
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

test.describe("Science page: OKLCH comes from the hex, not the manifest", {
  tag: "@science",
}, () => {
  for (const key of ["types", "keywords", "functions", "strings", "accent", "bg0"]) {
    test(`${key} matches culori's conversion of its hex within 0.01`, async ({ page }) => {
      await expectOklchMatchesHex(page, defaultTheme, key);
    });
  }
});

test.describe("Science page: honest contrast", { tag: "@science" }, () => {
  test("a translucent colour is reported after compositing over its background", async ({
    page,
  }) => {
    const { bg0, strings } = defaultTheme.colors;
    expect(strings, "strings is translucent (#rrggbbaa) in every theme").toMatch(/^#[0-9a-f]{8}$/i);
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
    await expect(
      page.locator('#main [data-oklch-row][data-color-key="strings"]'),
      "the row says the colour is translucent"
    ).toContainText(new RegExp(`${alphaPercent}\\s?%`));
  });

  test("an opaque colour reports its plain contrast over the background", async ({ page }) => {
    const { bg0, keywords } = defaultTheme.colors;
    const expected = renderedContrast(keywords, bg0);
    const cell = page.locator('#main [data-contrast-key="keywords"]');
    await expect(cell).toBeVisible();
    const ratio = Number(await cell.getAttribute("data-ratio"));
    expect(Math.abs(ratio - expected)).toBeLessThanOrEqual(0.05);
  });
});
