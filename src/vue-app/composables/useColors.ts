/**
 * useColors Composable
 * Provides theme-aware color access for canvas and programmatic operations
 */

import { computed } from "vue";
import { useTheme } from "./useTheme.js";

/**
 * Get a CSS custom property value from the document root
 */
function getCSSVar(name: string, fallback = ""): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * Composable for accessing theme colors programmatically
 * Useful for canvas rendering, SVG generation, and other non-CSS contexts
 */
export function useColors() {
  const { currentTheme } = useTheme();

  /**
   * Background colors
   */
  const backgrounds = computed(() => ({
    bg0: currentTheme.value?.colors.bg0 || getCSSVar("--bg0"),
    bg1: currentTheme.value?.colors.bg1 || getCSSVar("--bg1"),
    bg2: currentTheme.value?.colors.bg2 || getCSSVar("--bg2"),
    primary: currentTheme.value?.colors.bg0 || getCSSVar("--bg-primary"),
    secondary: currentTheme.value?.colors.bg1 || getCSSVar("--bg-secondary"),
    tertiary: currentTheme.value?.colors.bg2 || getCSSVar("--bg-tertiary"),
  }));

  /**
   * Foreground/text colors
   */
  const foregrounds = computed(() => ({
    fg0: currentTheme.value?.colors.fg0 || getCSSVar("--fg0"),
    fg1: currentTheme.value?.colors.fg1 || getCSSVar("--fg1"),
    fgMuted: currentTheme.value?.colors.fgMuted || getCSSVar("--fg-muted"),
    primary: currentTheme.value?.colors.types || getCSSVar("--text-primary"),
    secondary: currentTheme.value?.colors.functions || getCSSVar("--text-secondary"),
    muted: getCSSVar("--text-muted"),
  }));

  /**
   * Accent and semantic colors
   */
  const accents = computed(() => ({
    accent: currentTheme.value?.colors.accent || getCSSVar("--accent"),
    error: currentTheme.value?.colors.error || getCSSVar("--color-error"),
    warning: currentTheme.value?.colors.keywords || getCSSVar("--color-warning"),
    success: currentTheme.value?.colors.strings || getCSSVar("--color-success"),
    info: currentTheme.value?.colors.accent || getCSSVar("--color-info"),
  }));

  /**
   * Syntax highlighting colors
   */
  const syntax = computed(() => ({
    keywords: currentTheme.value?.colors.keywords || getCSSVar("--syntax-keywords"),
    types: currentTheme.value?.colors.types || getCSSVar("--syntax-types"),
    functions: currentTheme.value?.colors.functions || getCSSVar("--syntax-functions"),
    strings: currentTheme.value?.colors.strings || getCSSVar("--syntax-strings"),
    decorator: currentTheme.value?.colors.decorator || getCSSVar("--syntax-decorator"),
    error: currentTheme.value?.colors.error || getCSSVar("--syntax-error"),
  }));

  /**
   * App-specific chromatic typography colors
   */
  const appText = computed(() => ({
    primary: currentTheme.value?.colors.types || getCSSVar("--app-text-primary"),
    strong: currentTheme.value?.colors.keywords || getCSSVar("--app-text-strong"),
    muted: getCSSVar("--app-text-muted"),
    subtle: getCSSVar("--app-text-subtle"),
  }));

  /**
   * Border colors
   */
  const borders = computed(() => ({
    primary: getCSSVar("--border-primary"),
    secondary: getCSSVar("--border-secondary"),
    color: getCSSVar("--border-color"),
  }));

  /**
   * Get a color by CSS variable name (with optional fallback)
   * @param varName - CSS variable name (with or without --)
   * @param fallback - Optional fallback color
   */
  const getColor = (varName: string, fallback?: string): string => {
    const normalizedName = varName.startsWith("--") ? varName : `--${varName}`;
    return getCSSVar(normalizedName, fallback);
  };

  /**
   * Get all theme colors as a flat object
   */
  const all = computed(() => ({
    ...backgrounds.value,
    ...foregrounds.value,
    ...accents.value,
    ...syntax.value,
  }));

  return {
    // Grouped colors
    backgrounds,
    foregrounds,
    accents,
    syntax,
    appText,
    borders,

    // Utilities
    getColor,
    all,

    // Theme info
    currentTheme,
  };
}
