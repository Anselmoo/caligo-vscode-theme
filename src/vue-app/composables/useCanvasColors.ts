/**
 * useCanvasColors Composable
 *
 * Provides canvas-specific color utilities for rendering operations.
 * Integrates with Culori for OKLCH color conversions and ensures all
 * canvas rendering derives colors from the active theme.
 */

import { formatHex, formatRgb, type Oklch, oklch } from "culori";
import { computed } from "vue";
import { hexToRgba } from "../utils/color-utils.js";
import { useTheme } from "./useTheme.js";

// Re-export for external use
export { hexToRgba } from "../utils/color-utils.js";

/**
 * Get CSS variable value and convert to RGBA
 * Throws error if CSS variable is not set to ensure theme is loaded
 */
export function rgbaFromVar(cssVarName: string, alpha: number = 1): string {
  if (typeof document === "undefined") {
    throw new Error("rgbaFromVar: document is not available (SSR context)");
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();

  if (!value) {
    throw new Error(`rgbaFromVar: CSS variable ${cssVarName} is not set. Theme may not be loaded.`);
  }

  // If already RGB components, use them
  if (value.includes(",")) {
    return `rgba(${value}, ${alpha})`;
  }

  // Otherwise convert from hex
  return hexToRgba(value, alpha);
}

/**
 * Convert OKLCH color to RGBA string for canvas
 * Throws error if conversion fails to prevent silent color issues
 */
export function oklchToRgba(l: number, c: number, h: number, alpha: number = 1): string {
  const oklchColor: Oklch = { mode: "oklch", l, c, h };
  const rgb = formatRgb(oklchColor);

  if (!rgb) {
    throw new Error(`oklchToRgba: Failed to convert OKLCH(${l}, ${c}, ${h}) to RGB`);
  }

  // Extract RGB values from "rgb(r, g, b)" format
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    throw new Error(`oklchToRgba: Unexpected RGB format "${rgb}"`);
  }

  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
}

/**
 * Convert OKLCH color to hex string
 * Throws error if conversion fails to prevent silent color issues
 */
export function oklchToHex(l: number, c: number, h: number): string {
  const oklchColor: Oklch = { mode: "oklch", l, c, h };
  const hex = formatHex(oklchColor);

  if (!hex) {
    throw new Error(`oklchToHex: Failed to convert OKLCH(${l}, ${c}, ${h}) to hex`);
  }

  return hex;
}

/**
 * Parse hex color to OKLCH components
 */
export function hexToOklch(hex: string): Oklch | null {
  const color = oklch(hex);
  return color || null;
}

/**
 * Derive lighter variant of a color
 */
export function lighten(hex: string, amount: number = 0.1): string {
  const color = hexToOklch(hex);
  if (!color) return hex;

  const newL = Math.min(1, (color.l || 0) + amount);
  return oklchToHex(newL, color.c || 0, color.h || 0);
}

/**
 * Derive darker variant of a color
 */
export function darken(hex: string, amount: number = 0.1): string {
  const color = hexToOklch(hex);
  if (!color) return hex;

  const newL = Math.max(0, (color.l || 0) - amount);
  return oklchToHex(newL, color.c || 0, color.h || 0);
}

/**
 * Adjust chroma (saturation) of a color
 */
export function adjustChroma(hex: string, amount: number = 0.05): string {
  const color = hexToOklch(hex);
  if (!color) return hex;

  const newC = Math.max(0, Math.min(0.4, (color.c || 0) + amount));
  return oklchToHex(color.l || 0, newC, color.h || 0);
}

/**
 * Composable for canvas color operations
 *
 * @example
 * ```typescript
 * import { useCanvasColors } from '@/composables/useCanvasColors'
 *
 * const { backgrounds, foregrounds, accents, hexToRgba, oklchToRgba } = useCanvasColors()
 *
 * // Use in canvas rendering
 * ctx.fillStyle = backgrounds.value.bg0
 * ctx.strokeStyle = hexToRgba(accents.value.accent, 0.5)
 * ```
 */
export function useCanvasColors() {
  const { currentTheme } = useTheme();

  /**
   * Background colors for canvas
   * Throws error if theme is not loaded to prevent silent failures
   */
  const backgrounds = computed(() => {
    if (!currentTheme.value?.colors) {
      throw new Error("useCanvasColors: Theme is not loaded");
    }
    return {
      bg0: currentTheme.value.colors.bg0,
      bg1: currentTheme.value.colors.bg1,
      bg2: currentTheme.value.colors.bg2,
    };
  });

  /**
   * Foreground colors for canvas
   * Throws error if theme is not loaded to prevent silent failures
   */
  const foregrounds = computed(() => {
    if (!currentTheme.value?.colors) {
      throw new Error("useCanvasColors: Theme is not loaded");
    }
    return {
      fg0: currentTheme.value.colors.fg0,
      fg1: currentTheme.value.colors.fg1,
      fgMuted: currentTheme.value.colors.fgMuted,
    };
  });

  /**
   * Accent and semantic colors for canvas
   * Throws error if theme is not loaded to prevent silent failures
   */
  const accents = computed(() => {
    if (!currentTheme.value?.colors) {
      throw new Error("useCanvasColors: Theme is not loaded");
    }
    return {
      accent: currentTheme.value.colors.accent,
      error: currentTheme.value.colors.error,
      keywords: currentTheme.value.colors.keywords,
      types: currentTheme.value.colors.types,
      functions: currentTheme.value.colors.functions,
      strings: currentTheme.value.colors.strings,
      decorator: currentTheme.value.colors.decorator,
    };
  });

  /**
   * All theme colors as flat object
   */
  const all = computed(() => ({
    ...backgrounds.value,
    ...foregrounds.value,
    ...accents.value,
  }));

  return {
    // Color groups
    backgrounds,
    foregrounds,
    accents,
    all,

    // Conversion utilities
    hexToRgba,
    rgbaFromVar,
    oklchToRgba,
    oklchToHex,
    hexToOklch,

    // Color manipulation
    lighten,
    darken,
    adjustChroma,

    // Theme info
    currentTheme,
  };
}
