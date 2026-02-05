/**
 * useColorVariants Composable
 *
 * Provides component-specific color variants derived from theme.
 * Useful for UI components that need semantic color variations
 * (e.g., buttons, cards, badges, alerts).
 */

import { computed } from "vue";
import { useTheme } from "./useTheme.js";

export interface ColorVariant {
  /** Primary color for this variant */
  primary: string;
  /** Background color for this variant */
  background: string;
  /** Text color for this variant */
  text: string;
  /** Border color for this variant */
  border: string;
}

export type VariantName =
  | "keywords"
  | "types"
  | "functions"
  | "strings"
  | "decorator"
  | "accent"
  | "error"
  | "warning"
  | "success"
  | "info";

export interface ColorVariants {
  keywords: ColorVariant;
  types: ColorVariant;
  functions: ColorVariant;
  strings: ColorVariant;
  decorator: ColorVariant;
  accent: ColorVariant;
  error: ColorVariant;
  warning: ColorVariant;
  success: ColorVariant;
  info: ColorVariant;
}

/**
 * Composable for semantic color variants
 *
 * @example
 * ```vue
 * <script setup>
 * import { useColorVariants } from '@/composables/useColorVariants'
 *
 * const { variants, getVariant } = useColorVariants()
 *
 * // Get accent variant
 * const accentColors = variants.value.accent
 *
 * // Get specific variant
 * const errorVariant = getVariant('error')
 * </script>
 *
 * <template>
 *   <div
 *     :style="{
 *       color: variants.accent.text,
 *       background: variants.accent.background,
 *       border: `1px solid ${variants.accent.border}`
 *     }"
 *   >
 *     Accent content
 *   </div>
 * </template>
 * ```
 */
export function useColorVariants() {
  const { currentTheme } = useTheme();

  /**
   * All color variants derived from theme
   * Throws error if theme is not loaded to prevent silent failures
   */
  const variants = computed<ColorVariants>(() => {
    const theme = currentTheme.value;

    if (!theme?.colors) {
      throw new Error("useColorVariants: Theme is not loaded");
    }

    const bg0 = theme.colors.bg0;

    return {
      keywords: {
        primary: theme.colors.keywords,
        background: `color-mix(in oklab, ${theme.colors.keywords} 15%, ${bg0} 85%)`,
        text: theme.colors.keywords,
        border: `color-mix(in oklab, ${theme.colors.keywords} 30%, ${bg0} 70%)`,
      },
      types: {
        primary: theme.colors.types,
        background: `color-mix(in oklab, ${theme.colors.types} 15%, ${bg0} 85%)`,
        text: theme.colors.types,
        border: `color-mix(in oklab, ${theme.colors.types} 30%, ${bg0} 70%)`,
      },
      functions: {
        primary: theme.colors.functions,
        background: `color-mix(in oklab, ${theme.colors.functions} 15%, ${bg0} 85%)`,
        text: theme.colors.functions,
        border: `color-mix(in oklab, ${theme.colors.functions} 30%, ${bg0} 70%)`,
      },
      strings: {
        primary: theme.colors.strings,
        background: `color-mix(in oklab, ${theme.colors.strings} 15%, ${bg0} 85%)`,
        text: theme.colors.strings,
        border: `color-mix(in oklab, ${theme.colors.strings} 30%, ${bg0} 70%)`,
      },
      decorator: {
        primary: theme.colors.decorator,
        background: `color-mix(in oklab, ${theme.colors.decorator} 15%, ${bg0} 85%)`,
        text: theme.colors.decorator,
        border: `color-mix(in oklab, ${theme.colors.decorator} 30%, ${bg0} 70%)`,
      },
      accent: {
        primary: theme.colors.accent,
        background: `color-mix(in oklab, ${theme.colors.accent} 15%, ${bg0} 85%)`,
        text: theme.colors.accent,
        border: `color-mix(in oklab, ${theme.colors.accent} 30%, ${bg0} 70%)`,
      },
      error: {
        primary: theme.colors.error,
        background: `color-mix(in oklab, ${theme.colors.error} 15%, ${bg0} 85%)`,
        text: theme.colors.error,
        border: `color-mix(in oklab, ${theme.colors.error} 30%, ${bg0} 70%)`,
      },
      warning: {
        // Uses keywords color (typically yellow/orange) as per theme mapping
        primary: theme.colors.keywords,
        background: `color-mix(in oklab, ${theme.colors.keywords} 15%, ${bg0} 85%)`,
        text: theme.colors.keywords,
        border: `color-mix(in oklab, ${theme.colors.keywords} 30%, ${bg0} 70%)`,
      },
      success: {
        // Uses strings color (typically green/cyan) as per theme mapping
        primary: theme.colors.strings,
        background: `color-mix(in oklab, ${theme.colors.strings} 15%, ${bg0} 85%)`,
        text: theme.colors.strings,
        border: `color-mix(in oklab, ${theme.colors.strings} 30%, ${bg0} 70%)`,
      },
      info: {
        primary: theme.colors.accent,
        background: `color-mix(in oklab, ${theme.colors.accent} 15%, ${bg0} 85%)`,
        text: theme.colors.accent,
        border: `color-mix(in oklab, ${theme.colors.accent} 30%, ${bg0} 70%)`,
      },
    };
  });

  /**
   * Get a specific variant by name
   */
  const getVariant = (name: VariantName): ColorVariant => {
    return variants.value[name];
  };

  /**
   * Get primary color for a variant
   */
  const getPrimary = (name: VariantName): string => {
    return variants.value[name].primary;
  };

  /**
   * Get background color for a variant
   */
  const getBackground = (name: VariantName): string => {
    return variants.value[name].background;
  };

  /**
   * Get text color for a variant
   */
  const getText = (name: VariantName): string => {
    return variants.value[name].text;
  };

  /**
   * Get border color for a variant
   */
  const getBorder = (name: VariantName): string => {
    return variants.value[name].border;
  };

  return {
    // Variants map
    variants,

    // Utilities
    getVariant,
    getPrimary,
    getBackground,
    getText,
    getBorder,

    // Theme info
    currentTheme,
  };
}
