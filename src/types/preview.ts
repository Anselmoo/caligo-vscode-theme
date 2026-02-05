/**
 * Preview System Type Definitions
 * Types for the interactive theme preview/customization UI
 * These are distinct from the generated theme types in types/theme.ts
 */

/**
 * Preview theme seed - represents a base theme configuration in the preview UI
 */
export interface PreviewThemeSeed {
  name: string;
  baseHue: number;
  description: string;
}

/**
 * Preview harmony mode - interactive harmony configuration
 */
export interface PreviewHarmonyMode {
  id: string;
  name: string;
  description: string;
  generateHues: (baseHue: number) => number[];
}

/**
 * Generated color palette from preview
 */
export interface PreviewPalette {
  seed: PreviewThemeSeed;
  harmony: PreviewHarmonyMode;
  hues: number[];
  colors: Record<string, string>;
}
