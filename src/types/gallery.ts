/**
 * Gallery Type Definitions
 * Types for theme gallery and screenshot system
 */

/**
 * Theme screenshot metadata
 */
export interface ThemeScreenshot {
  themeKey?: string;
  themeName: string;
  seedId: string;
  seedLabel?: string;
  harmonyMode: string;
  harmonyLabel?: string;
  filename: string;
  exists: boolean;
}

/**
 * Gallery filter state
 */
export interface GalleryFilters {
  search: string;
  seed: string;
  harmony: string;
}

/**
 * Gallery option for dropdowns
 */
export interface GalleryOption {
  id: string;
  label: string;
}
