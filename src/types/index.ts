/**
 * Type Definitions Index
 * Centralized exports for all Caligo theme types
 */

// Gallery types
export type { GalleryFilters, GalleryOption, ThemeScreenshot } from "./gallery.js";

// Harmony mode types
export type { HarmonyMode } from "./harmony.js";
export { HARMONY_MODES, isValidHarmonyMode } from "./harmony.js";
// Preview UI types
export type { PreviewHarmonyMode, PreviewPalette, PreviewThemeSeed } from "./preview.js";
// Core theme types
export type {
  ThemeColors,
  ThemeCoreColor,
  ThemeHarmony,
  ThemeHarmonyId,
  ThemeIndex,
  ThemeIndexEntry,
  ThemeOKLCH,
  ThemeSeed,
} from "./theme.js";
