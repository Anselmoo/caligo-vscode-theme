/**
 * Core Theme Type Definitions
 * Single source of truth for theme-related types across the codebase
 */

/**
 * Theme harmony mode identifier
 * Maps to HarmonyMode string union from harmony-colors.ts
 */
export type ThemeHarmonyId =
  | "balanced"
  | "analogous"
  | "monochromatic"
  | "triadic"
  | "split-complementary";

/**
 * OKLCH color representation
 */
export interface ThemeOKLCH {
  l: number;
  c: number;
  h: number;
}

/**
 * Core theme colors for display
 */
export interface ThemeColors {
  bg0: string;
  bg1: string;
  bg2: string;
  fg0: string;
  fg1: string;
  fgMuted: string;
  accent: string;
  error: string;
  strings: string;
  types: string;
  functions: string;
  keywords: string;
  decorator: string;
}

/**
 * Core color with metadata
 */
export interface ThemeCoreColor {
  key: string;
  label: string;
  hex: string;
  oklch: ThemeOKLCH;
}

/**
 * Theme seed metadata for UI display
 */
export interface ThemeSeed {
  id: string;
  slug: string;
  label: string;
}

/**
 * Theme harmony metadata for UI display
 */
export interface ThemeHarmony {
  id: ThemeHarmonyId;
  label: string;
}

/**
 * Complete theme entry in theme index
 */
export interface ThemeIndexEntry {
  key: string;
  seedId: string;
  seedSlug: string;
  seedLabel: string;
  harmonyId: ThemeHarmonyId;
  harmonyLabel: string;
  displayName: string;
  colors: ThemeColors;
  core: ThemeCoreColor[];
  oklch: {
    accent: ThemeOKLCH;
    bg: ThemeOKLCH;
    fg: ThemeOKLCH;
  };
}

/**
 * Theme index manifest
 */
export interface ThemeIndex {
  defaultThemeKey: string;
  seeds: ThemeSeed[];
  harmonies: ThemeHarmony[];
  themes: Record<string, ThemeIndexEntry>;
}
