/**
 * Shared helpers for the Phase 2 acceptance specs.
 *
 * Not a spec file (playwright.config.ts only collects *.spec.ts), so nothing here
 * runs on its own. Every helper fails loudly; none of them skips a test.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export type ThemeColors = Record<
  | "bg0"
  | "bg1"
  | "bg2"
  | "fg0"
  | "fg1"
  | "fgMuted"
  | "accent"
  | "error"
  | "strings"
  | "types"
  | "functions"
  | "keywords"
  | "decorator",
  string
>;

export type ThemeEntry = {
  key: string;
  seedId: string;
  seedLabel: string;
  harmonyId: string;
  harmonyLabel: string;
  displayName: string;
  colors: ThemeColors;
  core: Array<{ key: string; hex: string }>;
};

export type ThemeManifest = {
  defaultThemeKey: string;
  seeds: Array<{ id: string }>;
  harmonies: Array<{ id: string }>;
  themes: Record<string, ThemeEntry>;
};

/**
 * The manifest the app serves (public/themes-manifest.json), read from disk so it
 * can be loaded in beforeAll, where the test-scoped `request` fixture is unavailable.
 */
export function loadThemeManifest(): ThemeManifest {
  const file = fileURLToPath(new URL("../../../public/themes-manifest.json", import.meta.url));
  return JSON.parse(readFileSync(file, "utf8")) as ThemeManifest;
}

export function themeByKey(manifest: ThemeManifest, key: string): ThemeEntry {
  const theme = manifest.themes[key];
  expect(theme, `theme ${key} exists in themes-manifest.json`).toBeTruthy();
  return theme;
}

/** A custom property on :root, trimmed and lower-cased (hex values are set verbatim). */
export async function rootVar(page: Page, name: string): Promise<string> {
  return page.evaluate(
    prop => getComputedStyle(document.documentElement).getPropertyValue(prop).trim().toLowerCase(),
    name
  );
}

/** Navigate and wait until the theme manifest has been applied to :root. */
export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect
    .poll(() => rootVar(page, "--bg0"), { message: "theme colours applied to :root" })
    .not.toBe("");
}

/** Wait until the site-wide theme is `theme` (setTheme applies inside a View Transition). */
export async function expectThemeApplied(page: Page, theme: ThemeEntry): Promise<void> {
  await expect
    .poll(() => rootVar(page, "--bg0"), { message: `--bg0 becomes ${theme.key}'s bg0` })
    .toBe(theme.colors.bg0.toLowerCase());
}

/** The nav's theme chip (Phase 1 AppNav), whose accessible name names the current theme. */
export function themeChip(page: Page) {
  return page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /theme/i });
}

/** Open the ⌘K / Ctrl+K palette, search, and apply the first result with Enter. */
export async function applyThemeViaPalette(page: Page, query: string): Promise<void> {
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: /switch theme/i });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill(query);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
}

/** `data-theme-id`s of the theme cards that are currently visible. */
export async function visibleThemeIds(page: Page): Promise<string[]> {
  return page
    .locator("#main [data-theme-card]:visible")
    .evaluateAll(cards => cards.map(card => card.getAttribute("data-theme-id") ?? ""));
}

/** Smallest angular distance between two hues, in degrees. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
