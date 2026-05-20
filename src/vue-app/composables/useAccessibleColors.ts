/**
 * useAccessibleColors Composable
 *
 * Provides APCA-W3 contrast checking for accessibility compliance.
 * Ensures all color combinations meet minimum contrast requirements.
 */

import { computed } from "vue";
import { APCAcontrast, sRGBtoY } from "../../lib/apca-wrapper.js";
import { hexToRgbTuple } from "../utils/color-utils.js";
import { useTheme } from "./useTheme.js";

/**
 * Minimum APCA contrast values for different text sizes
 * Based on APCA-W3 guidelines
 */
export const APCA_MINIMUMS = {
  /** Large text (18pt+) */
  large: 60,
  /** Medium text (14-18pt) */
  medium: 75,
  /** Small text (<14pt) */
  small: 90,
  /** Decorative/non-essential text */
  decorative: 45,
} as const;

export interface ContrastResult {
  /** APCA contrast value (0-108+) */
  contrast: number;
  /** Whether contrast meets minimum for small text */
  passSmall: boolean;
  /** Whether contrast meets minimum for medium text */
  passMedium: boolean;
  /** Whether contrast meets minimum for large text */
  passLarge: boolean;
  /** Recommended minimum text size */
  minTextSize: "small" | "medium" | "large" | "decorative";
}

/**
 * Check contrast between two colors using APCA-W3
 */
export function checkContrast(textColor: string, backgroundColor: string): ContrastResult {
  try {
    const textRGB = hexToRgbTuple(textColor);
    const bgRGB = hexToRgbTuple(backgroundColor);

    // Calculate APCA contrast
    const textY = sRGBtoY(textRGB);
    const bgY = sRGBtoY(bgRGB);
    const contrast = Math.abs(APCAcontrast(textY, bgY));

    return {
      contrast,
      passSmall: contrast >= APCA_MINIMUMS.small,
      passMedium: contrast >= APCA_MINIMUMS.medium,
      passLarge: contrast >= APCA_MINIMUMS.large,
      minTextSize:
        contrast >= APCA_MINIMUMS.small
          ? "small"
          : contrast >= APCA_MINIMUMS.medium
            ? "medium"
            : contrast >= APCA_MINIMUMS.large
              ? "large"
              : "decorative",
    };
  } catch (error) {
    console.error("Error checking contrast:", error);
    return {
      contrast: 0,
      passSmall: false,
      passMedium: false,
      passLarge: false,
      minTextSize: "decorative",
    };
  }
}

/**
 * Ensure text color has sufficient contrast against background
 * Returns the text color if contrast is sufficient, otherwise returns a high-contrast alternative
 *
 * @param textColor - The text color to check
 * @param backgroundColor - The background color
 * @param lightFallback - Light color fallback (must be theme-derived)
 * @param darkFallback - Dark color fallback (must be theme-derived)
 * @param minContrast - Minimum required contrast (default: APCA medium)
 */
export function ensureAccessibleText(
  textColor: string,
  backgroundColor: string,
  lightFallback: string,
  darkFallback: string,
  minContrast: number = APCA_MINIMUMS.medium
): string {
  const result = checkContrast(textColor, backgroundColor);

  if (result.contrast >= minContrast) {
    return textColor;
  }

  // Try light fallback
  const lightResult = checkContrast(lightFallback, backgroundColor);
  if (lightResult.contrast >= minContrast) {
    return lightFallback;
  }

  // Use dark fallback
  return darkFallback;
}

/**
 * Composable for accessibility-aware color operations
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAccessibleColors } from '@/composables/useAccessibleColors'
 *
 * const { checkThemeContrast, ensureAccessible } = useAccessibleColors()
 *
 * // Check if theme colors meet accessibility standards
 * const contrastResults = checkThemeContrast()
 *
 * // Ensure a color is accessible
 * const safeTextColor = ensureAccessible('#808080', '#000000')
 * </script>
 * ```
 */
export function useAccessibleColors() {
  const { currentTheme } = useTheme();

  /**
   * Check contrast for all common theme color pairs
   */
  const themeContrast = computed(() => {
    const theme = currentTheme.value;
    if (!theme) return null;

    const { colors } = theme;

    return {
      // Text on backgrounds
      fg0OnBg0: checkContrast(colors.fg0, colors.bg0),
      fg0OnBg1: checkContrast(colors.fg0, colors.bg1),
      fg0OnBg2: checkContrast(colors.fg0, colors.bg2),
      fg1OnBg0: checkContrast(colors.fg1, colors.bg0),
      fgMutedOnBg0: checkContrast(colors.fgMuted, colors.bg0),

      // Syntax colors on backgrounds
      keywordsOnBg0: checkContrast(colors.keywords, colors.bg0),
      typesOnBg0: checkContrast(colors.types, colors.bg0),
      functionsOnBg0: checkContrast(colors.functions, colors.bg0),
      stringsOnBg0: checkContrast(colors.strings, colors.bg0),
      decoratorOnBg0: checkContrast(colors.decorator, colors.bg0),

      // Accent on backgrounds
      accentOnBg0: checkContrast(colors.accent, colors.bg0),
      accentOnBg1: checkContrast(colors.accent, colors.bg1),

      // Error on backgrounds
      errorOnBg0: checkContrast(colors.error, colors.bg0),
    };
  });

  /**
   * Get all failing contrast pairs
   */
  const failingContrasts = computed(() => {
    const results = themeContrast.value;
    if (!results) return [];

    const failures: Array<{ pair: string; contrast: number; required: number }> = [];

    for (const [key, result] of Object.entries(results)) {
      if (!result.passMedium) {
        failures.push({
          pair: key,
          contrast: result.contrast,
          required: APCA_MINIMUMS.medium,
        });
      }
    }

    return failures;
  });

  /**
   * Check if all theme colors pass accessibility standards
   */
  const isAccessible = computed(() => {
    return failingContrasts.value.length === 0;
  });

  return {
    // Contrast checking
    checkContrast,
    ensureAccessibleText,

    // Theme accessibility
    themeContrast,
    failingContrasts,
    isAccessible,

    // Constants
    APCA_MINIMUMS,

    // Theme info
    currentTheme,
  };
}
