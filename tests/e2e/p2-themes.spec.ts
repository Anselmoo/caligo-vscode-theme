/**
 * Phase 2 acceptance: the Themes page (/#/themes).
 *
 * One page replaces the old Gallery and the Theme Spectrum: a matrix of every
 * variant (10 themes x 5 modes) as [data-theme-card] buttons, one quiet filter
 * toolbar (theme, mode, search), and a detail area for the selected variant.
 * Choosing a card applies that theme to the whole site.
 */

import { expect, test } from "@playwright/test";
import { converter, parse } from "culori";
import {
  expectThemeApplied,
  gotoApp,
  loadThemeManifest,
  rootVar,
  type ThemeManifest,
  themeByKey,
  themeChip,
  visibleThemeIds,
} from "./support/app";

const toRgb = converter("rgb");

/** True when two CSS colour strings render as the same sRGB colour (within 2/255). */
function sameColour(a: string, b: string): boolean {
  const ca = toRgb(parse(a));
  const cb = toRgb(parse(b));
  if (!ca || !cb) return false;
  if ((ca.alpha ?? 1) < 0.99) return false;
  return (["r", "g", "b"] as const).every(ch => Math.abs(ca[ch] - cb[ch]) <= 2 / 255);
}

const manifest: ThemeManifest = loadThemeManifest();

test.beforeEach(async ({ page }) => {
  await gotoApp(page, "/#/themes");
  await expect(page.locator("#main h1")).toBeVisible();
  await expect(page.locator("#main [data-theme-card]").first()).toBeVisible();
});

test.describe("Themes page: one matrix of every variant", { tag: "@themes" }, () => {
  test("shows all 50 variants as theme cards keyed by manifest id", async ({ page }) => {
    const cards = page.locator("#main [data-theme-card]");
    const keys = Object.keys(manifest.themes).sort();
    expect(keys).toHaveLength(50);
    await expect(cards).toHaveCount(keys.length);

    const ids = (await visibleThemeIds(page)).sort();
    expect(ids, "every manifest variant is reachable, each exactly once").toEqual(keys);

    const tags = await cards.evaluateAll(els => [...new Set(els.map(el => el.tagName))]);
    expect(tags, "theme cards are native buttons").toEqual(["BUTTON"]);
  });

  test("names each card by theme and mode", async ({ page }) => {
    const theme = themeByKey(manifest, "Caligo-CinderSplitComplementary");
    const card = page.locator(`#main [data-theme-card][data-theme-id="${theme.key}"]`);
    await expect(card).toHaveAccessibleName(new RegExp(theme.seedLabel, "i"));
    await expect(card).toHaveAccessibleName(new RegExp(theme.harmonyLabel, "i"));
  });

  test("each card is a small editor swatch in that variant's own colours", async ({ page }) => {
    for (const key of ["Caligo-EclipseTriadic", "Caligo-AuroraNoir", "Caligo-VoidEmberAnalogous"]) {
      const theme = themeByKey(manifest, key);
      const card = page.locator(`#main [data-theme-card][data-theme-id="${key}"]`);
      const painted = await card.evaluate(root => {
        const nodes = [root, ...root.querySelectorAll("*")];
        return nodes.flatMap(node => {
          const style = getComputedStyle(node);
          return [style.backgroundColor, style.color];
        });
      });
      expect(
        painted.some(value => sameColour(value, theme.colors.bg0)),
        `${key} card paints its bg0 ${theme.colors.bg0}`
      ).toBe(true);
      expect(
        painted.some(value => sameColour(value, theme.colors.keywords)),
        `${key} card shows its keyword ink ${theme.colors.keywords}`
      ).toBe(true);
    }
  });

  test("marks the current theme on arrival", async ({ page }) => {
    const pressed = page.locator('#main [data-theme-card][aria-pressed="true"]');
    await expect(pressed).toHaveCount(1);
    await expect(pressed).toHaveAttribute("data-theme-id", manifest.defaultThemeKey);
  });
});

test.describe("Themes page: filters", { tag: "@themes" }, () => {
  test("filters by theme", async ({ page }) => {
    const themeFilter = page.locator("#main").getByLabel("Theme", { exact: true });
    await themeFilter.selectOption("Eclipse");
    const expected = Object.values(manifest.themes)
      .filter(t => t.seedId === "Eclipse")
      .map(t => t.key)
      .sort();
    expect(expected).toHaveLength(5);
    await expect.poll(async () => (await visibleThemeIds(page)).sort()).toEqual(expected);

    await themeFilter.selectOption("");
    await expect.poll(async () => (await visibleThemeIds(page)).length).toBe(50);
  });

  test("filters by harmony mode", async ({ page }) => {
    const modeFilter = page.locator("#main").getByLabel("Mode", { exact: true });
    await modeFilter.selectOption("triadic");
    const expected = Object.values(manifest.themes)
      .filter(t => t.harmonyId === "triadic")
      .map(t => t.key)
      .sort();
    expect(expected).toHaveLength(10);
    await expect.poll(async () => (await visibleThemeIds(page)).sort()).toEqual(expected);
  });

  test("searches by name and combines with the mode filter", async ({ page }) => {
    const search = page.locator("#main").getByRole("searchbox", { name: /search/i });
    await search.fill("eclipse");
    const eclipse = Object.values(manifest.themes)
      .filter(t => t.seedId === "Eclipse")
      .map(t => t.key)
      .sort();
    await expect.poll(async () => (await visibleThemeIds(page)).sort()).toEqual(eclipse);

    await page.locator("#main").getByLabel("Mode", { exact: true }).selectOption("triadic");
    await expect.poll(() => visibleThemeIds(page)).toEqual(["Caligo-EclipseTriadic"]);
  });

  test("says so plainly when nothing matches, and offers to clear", async ({ page }) => {
    const search = page.locator("#main").getByRole("searchbox", { name: /search/i });
    await search.fill("no-such-theme-xyz");
    await expect.poll(() => visibleThemeIds(page)).toEqual([]);

    const clear = page.locator("#main").getByRole("button", { name: /clear filters/i });
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(search).toHaveValue("");
    await expect.poll(async () => (await visibleThemeIds(page)).length).toBe(50);
  });
});

test.describe("Themes page: choosing a variant", { tag: "@themes" }, () => {
  test("applies the theme site-wide and keeps it across pages", async ({ page }) => {
    const target = themeByKey(manifest, "Caligo-EclipseTriadic");
    const before = await rootVar(page, "--bg0");
    expect(before).not.toBe(target.colors.bg0.toLowerCase());

    const card = page.locator(`#main [data-theme-card][data-theme-id="${target.key}"]`);
    await card.click();

    await expectThemeApplied(page, target);
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('#main [data-theme-card][aria-pressed="true"]')).toHaveCount(1);
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(target.seedLabel));
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(target.harmonyLabel));
    expect(await page.evaluate(() => localStorage.getItem("caligo-site-theme"))).toBe(target.key);

    const detail = page.locator("#main [data-selected-variant]");
    await expect(detail).toContainText(target.displayName);

    const nav = page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: "Science", exact: true }).click();
    await expect(page).toHaveURL(/#\/science$/);
    expect(await rootVar(page, "--bg0")).toBe(target.colors.bg0.toLowerCase());

    await nav.getByRole("link", { name: "Themes", exact: true }).click();
    await expect(
      page.locator(`#main [data-theme-card][data-theme-id="${target.key}"]`)
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("is keyboard operable: Tab reaches the cards, Enter and Space apply", async ({ page }) => {
    const search = page.locator("#main").getByRole("searchbox", { name: /search/i });
    await search.focus();
    let reached = false;
    for (let i = 0; i < 15 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(
        () => document.activeElement?.hasAttribute("data-theme-card") ?? false
      );
    }
    expect(reached, "Tab from the search field reaches a theme card").toBe(true);

    const focusRing = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return { outline: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow };
    });
    expect(
      (focusRing.outline !== "none" && focusRing.width !== "0px") || focusRing.shadow !== "none",
      `focused card shows a focus indicator (${JSON.stringify(focusRing)})`
    ).toBe(true);

    const triadic = themeByKey(manifest, "Caligo-EclipseTriadic");
    await page.locator(`#main [data-theme-card][data-theme-id="${triadic.key}"]`).focus();
    await page.keyboard.press("Enter");
    await expectThemeApplied(page, triadic);

    const aurora = themeByKey(manifest, "Caligo-AuroraNoir");
    await page.locator(`#main [data-theme-card][data-theme-id="${aurora.key}"]`).focus();
    await page.keyboard.press("Space");
    await expectThemeApplied(page, aurora);
  });
});
