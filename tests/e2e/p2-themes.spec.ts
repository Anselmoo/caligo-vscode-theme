/**
 * Phase 2 acceptance: the Themes page (/#/themes) and the Theme Spectrum.
 *
 * The Spectrum is the site's one theme chooser (Home and Themes render the same
 * component): a table of 10 seed palettes (rows) x 5 harmony modes (columns), each
 * cell a `button[data-chip]` painted in that variant's own colours. Choosing a chip
 * applies the theme site-wide, announces it, and names it in the address (`?theme=`).
 * Below it, the Themes page shows the active variant: a live editor mock-up, its core
 * palette, how to wear it in VS Code and the export panel.
 */

import { expect, type Locator, type Page, test } from "@playwright/test";
import { converter, parse } from "culori";
import {
  chipFor,
  expectThemeApplied,
  gotoApp,
  loadThemeManifest,
  rootVar,
  spectrum,
  type ThemeManifest,
  themeByKey,
  themeChip,
  themeSlug,
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
const defaultTheme = themeByKey(manifest, manifest.defaultThemeKey);
const eclipseTriadic = themeByKey(manifest, "Caligo-EclipseTriadic");
const auroraNoir = themeByKey(manifest, "Caligo-AuroraNoir");

/** The chip at a grid position (row = seed, column = harmony mode). */
function chipAt(page: Page, row: number, col: number) {
  return spectrum(page).locator(`button[data-chip][data-row="${row}"][data-col="${col}"]`);
}

async function gridPosition(page: Page, key: string): Promise<{ row: number; col: number }> {
  const chip = chipFor(page, key);
  return {
    row: Number(await chip.getAttribute("data-row")),
    col: Number(await chip.getAttribute("data-col")),
  };
}

async function activeChipKey(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    return el?.hasAttribute("data-chip") ? el.getAttribute("data-key") : null;
  });
}

async function openThemes(page: Page) {
  await gotoApp(page, "/#/themes");
  await expect(page.locator("#main h1")).toHaveText("Themes");
  await expect(page.locator("#main [data-chip]").first()).toBeVisible();
}

test.describe("Theme Spectrum: every variant on one wall", { tag: "@themes" }, () => {
  test.beforeEach(async ({ page }) => {
    await openThemes(page);
  });

  test("shows all 50 variants as chips keyed by manifest id, in 10 rows x 5 columns", async ({
    page,
  }) => {
    const keys = Object.keys(manifest.themes).sort();
    expect(keys).toHaveLength(50);
    expect(manifest.seeds).toHaveLength(10);
    expect(manifest.harmonies).toHaveLength(5);

    const chips = spectrum(page).locator("button[data-chip]");
    await expect(chips).toHaveCount(50);
    const ids = (await chips.evaluateAll(els => els.map(el => el.getAttribute("data-key") ?? "")))
      .slice()
      .sort();
    expect(ids, "every manifest variant is reachable, each exactly once").toEqual(keys);

    const tags = await chips.evaluateAll(els => [...new Set(els.map(el => el.tagName))]);
    expect(tags, "chips are native buttons").toEqual(["BUTTON"]);

    const table = spectrum(page).locator("table");
    await expect(table.locator("tbody tr")).toHaveCount(10);
    await expect(table.locator('thead th[scope="col"]')).toHaveCount(5);
    await expect(table.locator('tbody th[scope="row"]')).toHaveCount(10);
    for (const row of await table.locator("tbody tr").all()) {
      await expect(row.locator("button[data-chip]")).toHaveCount(5);
    }
  });

  test("is headed and explained, with a legend of the five harmony modes", async ({ page }) => {
    const section = spectrum(page);
    await expect(section.getByRole("heading", { level: 2, name: "Theme Spectrum" })).toBeVisible();
    await expect(section).toContainText(
      "10 seed palettes × 5 harmony modes. Click any cell to apply."
    );
    await expect(section.locator(".legend__item")).toHaveCount(5);
  });

  test("rows are named by seed palette and columns by harmony mode", async ({ page }) => {
    const table = spectrum(page).locator("table");
    const rowNames = (await table.locator('tbody th[scope="row"]').allInnerTexts()).map(t =>
      t.trim()
    );
    expect(rowNames.slice().sort()).toEqual(
      [...new Set(Object.values(manifest.themes).map(t => t.seedLabel))].sort()
    );

    const letters = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");
    const colNames = (await table.locator("thead .grid__col-label").allTextContents()).map(letters);
    expect(colNames.slice().sort()).toEqual(
      [...new Set(Object.values(manifest.themes).map(t => letters(t.harmonyId)))].sort()
    );
  });

  test("names each chip by seed palette and harmony mode", async ({ page }) => {
    for (const key of ["Caligo-CinderSplitComplementary", "Caligo-EclipseTriadic"]) {
      const theme = themeByKey(manifest, key);
      await expect(chipFor(page, key)).toHaveAccessibleName(
        `${theme.seedLabel} ${theme.harmonyLabel}`
      );
    }
  });

  test("each chip is a swatch in that variant's own colours", async ({ page }) => {
    for (const key of ["Caligo-EclipseTriadic", "Caligo-AuroraNoir", "Caligo-VoidEmberAnalogous"]) {
      const theme = themeByKey(manifest, key);
      const chip = chipFor(page, key);
      const facts = await chip.evaluate(el => ({
        bg: getComputedStyle(el).backgroundColor,
        chipBg: (el as HTMLElement).style.getPropertyValue("--chip-bg"),
        inks: [...el.querySelectorAll(".chip__ink")].map(
          ink => getComputedStyle(ink).backgroundColor
        ),
      }));
      expect(
        sameColour(facts.chipBg, theme.colors.bg0),
        `${key} --chip-bg ${facts.chipBg} is its bg0 ${theme.colors.bg0}`
      ).toBe(true);
      expect(
        sameColour(facts.bg, theme.colors.bg0),
        `${key} chip paints its bg0 ${theme.colors.bg0} (got ${facts.bg})`
      ).toBe(true);
      expect(facts.inks, `${key} shows six ink dots`).toHaveLength(6);
      expect(
        facts.inks.some(ink => sameColour(ink, theme.colors.keywords)),
        `${key} shows its keyword ink ${theme.colors.keywords}`
      ).toBe(true);
    }
  });

  test("every palette row carries its own icon beside its name", async ({ page }) => {
    const heads = spectrum(page).locator("tbody th[scope='row']");
    await expect(heads).toHaveCount(manifest.seeds.length);
    const icons = await heads.evaluateAll(els =>
      els.map(el => el.querySelector("svg.seed-glyph path")?.getAttribute("d") ?? "")
    );
    expect(
      icons.every(d => d.length > 0),
      "each row has a drawn icon"
    ).toBe(true);
    expect(new Set(icons).size, "no two rows share an icon").toBe(manifest.seeds.length);
  });

  test("marks exactly one chip as pressed on arrival: the default theme", async ({ page }) => {
    const pressed = spectrum(page).locator('button[data-chip][aria-pressed="true"]');
    await expect(pressed).toHaveCount(1);
    await expect(pressed).toHaveAttribute("data-key", manifest.defaultThemeKey);
    await expect(spectrum(page).locator('button[data-chip][aria-pressed="false"]')).toHaveCount(49);
  });

  test("keeps one tab stop (roving tabindex) on the active theme's chip", async ({ page }) => {
    const stops = spectrum(page).locator('button[data-chip][tabindex="0"]');
    await expect(stops).toHaveCount(1);
    await expect(stops).toHaveAttribute("data-key", manifest.defaultThemeKey);
    await expect(spectrum(page).locator('button[data-chip][tabindex="-1"]')).toHaveCount(49);
  });
});

test.describe("Theme Spectrum: keyboard", { tag: "@themes" }, () => {
  test.beforeEach(async ({ page }) => {
    await openThemes(page);
  });

  test("Tab enters the table on the active chip and shows a focus indicator", async ({ page }) => {
    await page.locator("#main").focus();
    let reached = false;
    for (let i = 0; i < 12 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = (await activeChipKey(page)) !== null;
    }
    expect(reached, "Tab reaches the Spectrum").toBe(true);
    expect(await activeChipKey(page), "the table's one tab stop is the active theme").toBe(
      manifest.defaultThemeKey
    );

    const focusRing = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as HTMLElement);
      return { outline: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow };
    });
    expect(
      (focusRing.outline !== "none" && focusRing.width !== "0px") || focusRing.shadow !== "none",
      `focused chip shows a focus indicator (${JSON.stringify(focusRing)})`
    ).toBe(true);
  });

  test("arrow keys move between chips; Home and End jump along the row", async ({ page }) => {
    const start = await gridPosition(page, manifest.defaultThemeKey);
    await chipFor(page, manifest.defaultThemeKey).focus();

    await page.keyboard.press("ArrowRight");
    await expect(chipAt(page, start.row, start.col + 1)).toBeFocused();
    // The roving tab stop follows focus.
    await expect(chipAt(page, start.row, start.col + 1)).toHaveAttribute("tabindex", "0");
    await expect(spectrum(page).locator('button[data-chip][tabindex="0"]')).toHaveCount(1);

    await page.keyboard.press("ArrowDown");
    await expect(chipAt(page, start.row + 1, start.col + 1)).toBeFocused();

    await page.keyboard.press("ArrowLeft");
    await expect(chipAt(page, start.row + 1, start.col)).toBeFocused();

    await page.keyboard.press("ArrowUp");
    await expect(chipAt(page, start.row, start.col)).toBeFocused();

    await page.keyboard.press("End");
    await expect(chipAt(page, start.row, 4)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(chipAt(page, start.row, 0)).toBeFocused();

    const unpressed = await spectrum(page)
      .locator('button[data-chip][aria-pressed="true"]')
      .getAttribute("data-key");
    expect(unpressed, "moving focus alone does not change the theme").toBe(
      manifest.defaultThemeKey
    );
  });

  test("arrow keys stop at the edges of the grid", async ({ page }) => {
    await chipAt(page, 0, 0).focus();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await expect(chipAt(page, 0, 0)).toBeFocused();

    await chipAt(page, 9, 4).focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await expect(chipAt(page, 9, 4)).toBeFocused();
  });

  test("Enter and Space apply the focused chip", async ({ page }) => {
    await chipFor(page, eclipseTriadic.key).focus();
    await page.keyboard.press("Enter");
    await expectThemeApplied(page, eclipseTriadic);
    await expect(chipFor(page, eclipseTriadic.key)).toHaveAttribute("aria-pressed", "true");

    await chipFor(page, auroraNoir.key).focus();
    await page.keyboard.press("Space");
    await expectThemeApplied(page, auroraNoir);
    await expect(chipFor(page, auroraNoir.key)).toHaveAttribute("aria-pressed", "true");
    await expect(chipFor(page, eclipseTriadic.key)).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("Theme Spectrum: choosing a variant", { tag: "@themes" }, () => {
  test("applies the theme site-wide and keeps it across pages", async ({ page }) => {
    await openThemes(page);
    const before = await rootVar(page, "--bg0");
    expect(before).not.toBe(eclipseTriadic.colors.bg0.toLowerCase());

    const chip = chipFor(page, eclipseTriadic.key);
    await chip.click();

    await expectThemeApplied(page, eclipseTriadic);
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(spectrum(page).locator('button[data-chip][aria-pressed="true"]')).toHaveCount(1);
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(eclipseTriadic.seedLabel));
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(eclipseTriadic.harmonyLabel));
    expect(await page.evaluate(() => localStorage.getItem("caligo-site-theme"))).toBe(
      eclipseTriadic.key
    );

    const nav = page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: "Science", exact: true }).click();
    await expect(page).toHaveURL(/#\/science$/);
    expect(await rootVar(page, "--bg0")).toBe(eclipseTriadic.colors.bg0.toLowerCase());

    await nav.getByRole("link", { name: "Themes", exact: true }).click();
    await expect(chipFor(page, eclipseTriadic.key)).toHaveAttribute("aria-pressed", "true");

    await nav.getByRole("link", { name: "Caligo home" }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(chipFor(page, eclipseTriadic.key)).toHaveAttribute("aria-pressed", "true");
    expect(await rootVar(page, "--bg0")).toBe(eclipseTriadic.colors.bg0.toLowerCase());
  });

  test("announces the choice in a polite live region", async ({ page }) => {
    await openThemes(page);
    const live = spectrum(page).locator('[aria-live="polite"]');
    await expect(live).toHaveText("");
    await chipFor(page, eclipseTriadic.key).click();
    await expect(live).toHaveText(
      `Now wearing ${eclipseTriadic.seedLabel}, ${eclipseTriadic.harmonyLabel}.`
    );
  });

  test("writes ?theme=<seed>-<mode> into the address, before the hash", async ({ page }) => {
    await openThemes(page);
    expect(new URL(page.url()).searchParams.get("theme"), "no param before a pick").toBeNull();

    await chipFor(page, eclipseTriadic.key).click();
    await expectThemeApplied(page, eclipseTriadic);
    expect(themeSlug(eclipseTriadic)).toBe("eclipse-triadic");
    await expect.poll(() => new URL(page.url()).searchParams.get("theme")).toBe("eclipse-triadic");
    expect(new URL(page.url()).hash, "the route is untouched").toBe("#/themes");
    expect(page.url()).toMatch(/\?theme=eclipse-triadic#\/themes$/);

    const split = themeByKey(manifest, "Caligo-CinderSplitComplementary");
    await chipFor(page, split.key).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("theme")).toBe(themeSlug(split));
  });

  test("reloading the address keeps the theme", async ({ page }) => {
    await openThemes(page);
    await chipFor(page, eclipseTriadic.key).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("theme")).toBe("eclipse-triadic");

    await page.reload();
    await expect(chipFor(page, eclipseTriadic.key)).toHaveAttribute("aria-pressed", "true");
    await expectThemeApplied(page, eclipseTriadic);
  });

  test("a return visit without the param restores the last pick", async ({ page }) => {
    await openThemes(page);
    await chipFor(page, auroraNoir.key).click();
    await expectThemeApplied(page, auroraNoir);

    // A bare URL: no ?theme=, so only localStorage can bring the pick back.
    await page.goto("/#/themes");
    await page.reload();
    expect(new URL(page.url()).searchParams.get("theme")).toBeNull();
    await expectThemeApplied(page, auroraNoir);
    await expect(chipFor(page, auroraNoir.key)).toHaveAttribute("aria-pressed", "true");
  });

  test("a ?theme= link opens the site in that theme, and beats the last pick", async ({ page }) => {
    await openThemes(page);
    await chipFor(page, auroraNoir.key).click();
    await expectThemeApplied(page, auroraNoir);

    await page.goto("/?theme=eclipse-triadic#/themes");
    await expectThemeApplied(page, eclipseTriadic);
    await expect(chipFor(page, eclipseTriadic.key)).toHaveAttribute("aria-pressed", "true");
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(eclipseTriadic.seedLabel));

    await page.goto("/?theme=eclipse-triadic#/");
    await expect(chipFor(page, eclipseTriadic.key)).toHaveAttribute("aria-pressed", "true");
  });

  test("an unknown ?theme= falls back to the default theme", async ({ page }) => {
    await page.goto("/?theme=no-such-theme#/themes");
    await expectThemeApplied(page, defaultTheme);
    await expect(chipFor(page, defaultTheme.key)).toHaveAttribute("aria-pressed", "true");
  });

  test("Home hosts the same Spectrum, one click from the hero", async ({ page }) => {
    await gotoApp(page, "/");
    const home = page.locator("#spectrum");
    await expect(home.locator("button[data-chip]")).toHaveCount(50);
    await expect(home.locator('button[data-chip][aria-pressed="true"]')).toHaveAttribute(
      "data-key",
      manifest.defaultThemeKey
    );

    await chipFor(page, eclipseTriadic.key).click();
    await expectThemeApplied(page, eclipseTriadic);
    await expect(chipFor(page, eclipseTriadic.key)).toHaveAttribute("aria-pressed", "true");
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(eclipseTriadic.harmonyLabel));
  });
});

test.describe("Themes page: the active variant", { tag: "@themes" }, () => {
  test.beforeEach(async ({ page }) => {
    await openThemes(page);
  });

  test("draws a live editor, names the variant and lists its core palette", async ({ page }) => {
    const detail = page.locator("#main [data-selected-variant]");
    await expect(detail.getByRole("img", { name: "VS Code editor preview" })).toBeVisible();
    await expect(detail.getByRole("heading", { level: 2 })).toHaveText(defaultTheme.displayName);

    const items = detail.getByRole("list", { name: "Core colours" }).getByRole("listitem");
    await expect(items).toHaveCount(defaultTheme.core.length);
    for (const { hex } of defaultTheme.core) {
      await expect(detail.getByRole("list", { name: "Core colours" })).toContainText(hex);
    }
  });

  test("follows the Spectrum: a new pick renames the variant and swaps the palette", async ({
    page,
  }) => {
    await chipFor(page, eclipseTriadic.key).click();
    await expectThemeApplied(page, eclipseTriadic);

    const detail = page.locator("#main [data-selected-variant]");
    await expect(detail.getByRole("heading", { level: 2 })).toHaveText(eclipseTriadic.displayName);
    const palette = detail.getByRole("list", { name: "Core colours" });
    for (const { hex } of eclipseTriadic.core) await expect(palette).toContainText(hex);
  });

  test("Wear it: the install command and the exact VS Code theme name, each copyable", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await chipFor(page, eclipseTriadic.key).click();
    await expectThemeApplied(page, eclipseTriadic);

    const wear = page.locator("#main section[aria-labelledby='wear-title']");
    await expect(
      wear.getByRole("heading", { name: `Wear ${eclipseTriadic.displayName} in VS Code` })
    ).toBeVisible();

    const install = "code --install-extension AnselmHahn.caligo-vscode-theme";
    await expect(wear.locator("code").nth(0)).toHaveText(install);
    await expect(wear.locator("code").nth(1)).toHaveText(eclipseTriadic.vscodeLabel);
    expect(eclipseTriadic.vscodeLabel, "the label is the one VS Code lists").toContain(
      eclipseTriadic.seedLabel
    );

    // Addressed by step, not by name: the button renames itself to "Copied" for a moment.
    const copyCommand = wear.getByRole("listitem").nth(0).getByRole("button");
    await expect(copyCommand).toHaveAccessibleName(/Copy command/);
    await copyCommand.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(install);
    await expect(copyCommand).toHaveAccessibleName(/Copied/);

    const copyName = wear.getByRole("listitem").nth(1).getByRole("button");
    await expect(copyName).toHaveAccessibleName(/Copy name/);
    await copyName.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      eclipseTriadic.vscodeLabel
    );
    await expect(copyName).toHaveAccessibleName(/Copied/);
  });

  test("hosts the export panel, which names the active theme", async ({ page }) => {
    const panel = page.locator("#main section#export");
    await expect(panel).toBeVisible();
    await expect(panel.locator("[data-export-theme]")).toContainText(defaultTheme.displayName);
    await expect(panel.locator("[data-export-action]").first()).toBeVisible();
    await expect(panel.getByRole("status")).toBeAttached();
  });
});

/** A 1x1 PNG, enough for the page to treat the screenshot as loaded. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

/**
 * Serve a screenshots manifest in which only `withShot` has a real screenshot, plus the
 * images themselves. Screenshots are generated by CI and are absent from a dev checkout.
 */
async function serveScreenshots(page: Page, withShot: Record<string, string>) {
  await page.route("**/screenshots-manifest.json", route =>
    route.fulfill({
      json: {
        screenshots: Object.values(manifest.themes).map(theme => ({
          themeKey: theme.key,
          themeName: theme.displayName,
          filename: `/screenshots/${withShot[theme.key] ?? `${theme.key}.png`}`,
          exists: theme.key in withShot,
        })),
      },
    })
  );
  await page.route("**/screenshots/*.png", route =>
    route.fulfill({ body: PIXEL, contentType: "image/png" })
  );
}

test.describe("Themes page: the real VS Code screenshot", { tag: "@themes" }, () => {
  const peek = (page: Page) => page.locator("#main [data-screenshot-peek]");
  const toggle = (page: Page) => peek(page).locator("button.peek__toggle");
  const box = async (locator: Locator) => {
    const rect = await locator.boundingBox();
    if (!rect) throw new Error("expected the element to be laid out");
    return rect;
  };

  test("sits top right of the header as a small thumbnail", async ({ page }) => {
    await serveScreenshots(page, { [defaultTheme.key]: "default.png" });
    await gotoApp(page, "/#/themes");

    await expect(toggle(page)).toBeVisible();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    const head = await box(page.locator("#main header").first());
    const card = await box(peek(page).locator(".peek__card"));
    expect(Math.abs(card.x + card.width - (head.x + head.width)), "flush right").toBeLessThan(4);
    expect(Math.abs(card.y - head.y), "flush top").toBeLessThan(8);
    expect(card.width).toBeLessThan(260);
  });

  test("opens on click and closes on a second click, Close or Escape", async ({ page }) => {
    await serveScreenshots(page, { [defaultTheme.key]: "default.png" });
    await gotoApp(page, "/#/themes");
    const card = peek(page).locator(".peek__card");
    const small = (await box(card)).width;

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect.poll(async () => (await box(card)).width).toBeGreaterThan(small * 2);

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");

    await toggle(page).click();
    await peek(page).getByRole("button", { name: "Close", exact: true }).click();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");

    await toggle(page).click();
    await page.keyboard.press("Escape");
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(toggle(page), "focus returns to the thumbnail").toBeFocused();
  });

  test("swaps to the next theme's screenshot and stays open", async ({ page }) => {
    await serveScreenshots(page, {
      [defaultTheme.key]: "default.png",
      [eclipseTriadic.key]: "eclipse.png",
    });
    await gotoApp(page, "/#/themes");
    await toggle(page).click();
    await expect(peek(page).locator("img")).toHaveAttribute("src", /default\.png$/);

    await chipFor(page, eclipseTriadic.key).click();
    await expectThemeApplied(page, eclipseTriadic);
    await expect(peek(page).locator("img")).toHaveAttribute("src", /eclipse\.png$/);
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  });

  test("is absent when CI made no screenshot for the theme", async ({ page }) => {
    await serveScreenshots(page, { [eclipseTriadic.key]: "eclipse.png" });
    await gotoApp(page, "/#/themes");
    await expect(page.locator("#main h1")).toBeVisible();
    await expect(peek(page)).toHaveCount(0);
  });
});
