/**
 * The active theme as part of the address: `?theme=auroranoir-triadic`.
 *
 * It sits in the query, before the hash, so it survives every route change of the
 * hash router and a copied link opens the site already wearing that variant.
 * Without a link, the visitor's last pick (localStorage) comes back; without
 * either, the manifest default applies.
 */
import type { ThemeIndex, ThemeIndexEntry } from "../types/theme.js";

export const THEME_PARAM = "theme";
const STORAGE_KEY = "caligo-site-theme";

type SlugSource = Pick<ThemeIndexEntry, "seedId" | "harmonyId"> & { seedSlug?: string };

/** "AuroraNoir" + "split-complementary" → "auroranoir-split-complementary". */
export function themeSlug(theme: SlugSource): string {
  const seed = (theme.seedSlug ?? theme.seedId ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return seed && theme.harmonyId ? `${seed}-${theme.harmonyId}` : "";
}

/** Theme key for a slug (or a raw theme key), or null when nothing matches. */
export function themeKeyForSlug(index: ThemeIndex, slug: string | null): string | null {
  if (!slug) return null;
  if (index.themes[slug]) return slug;
  const wanted = slug.toLowerCase();
  const hit = Object.values(index.themes).find(t => themeSlug(t as SlugSource) === wanted);
  return hit?.key ?? null;
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeTheme(themeKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, themeKey);
  } catch {
    // Private mode or blocked storage: the link still carries the choice.
  }
}

/** Link first, then the last pick, then the manifest default. */
export function initialThemeKey(index: ThemeIndex, search = window.location.search): string {
  const fromLink = themeKeyForSlug(index, new URLSearchParams(search).get(THEME_PARAM));
  if (fromLink) return fromLink;
  const stored = readStored();
  if (stored && index.themes[stored]) return stored;
  return index.defaultThemeKey;
}

/** Rewrite the address bar in place so the current URL always names the active theme. */
export function writeThemeToAddress(theme: SlugSource): void {
  const slug = themeSlug(theme);
  if (!slug || typeof history === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get(THEME_PARAM) === slug) return;
  url.searchParams.set(THEME_PARAM, slug);
  history.replaceState(history.state, "", url);
}
