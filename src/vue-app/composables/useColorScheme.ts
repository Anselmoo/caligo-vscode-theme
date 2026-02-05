/**
 * useColorScheme Composable
 *
 * Provides reactive access to all theme color tokens from the active Caligo theme.
 * This is the primary composable for theme-aware color access in Vue components.
 *
 * All colors are derived from the selected VSCode theme with zero hardcoded fallbacks.
 * Theme changes propagate reactively via Pinia store integration.
 */

import { computed } from "vue";
import { hexToRgb } from "../utils/color-utils.js";
import { useColors } from "./useColors.js";
import { useTheme } from "./useTheme.js";

export interface ColorToken {
  /** CSS variable name (e.g., "--bg0") */
  cssVar: string;
  /** Current hex value from theme */
  value: string;
  /** RGB components as string "r, g, b" */
  rgb: string;
}

export interface ColorTokenMap {
  // Background tokens
  bg0: ColorToken;
  bg1: ColorToken;
  bg2: ColorToken;
  bgPrimary: ColorToken;
  bgSecondary: ColorToken;
  bgTertiary: ColorToken;

  // Foreground tokens
  fg0: ColorToken;
  fg1: ColorToken;
  fgMuted: ColorToken;
  textPrimary: ColorToken;
  textSecondary: ColorToken;
  textMuted: ColorToken;

  // Accent tokens
  accent: ColorToken;
  accentAlt: ColorToken;

  // Semantic state tokens
  error: ColorToken;
  warning: ColorToken;
  success: ColorToken;
  info: ColorToken;

  // Syntax highlighting tokens
  keywords: ColorToken;
  types: ColorToken;
  functions: ColorToken;
  strings: ColorToken;
  decorator: ColorToken;
  syntaxError: ColorToken;

  // App typography tokens
  appTextPrimary: ColorToken;
  appTextStrong: ColorToken;
  appTextMuted: ColorToken;
  appTextSubtle: ColorToken;

  // Border tokens
  borderPrimary: ColorToken;
  borderSecondary: ColorToken;
  borderColor: ColorToken;
}

/**
 * Get a CSS custom property value from document root
 */
function getCSSVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Create a ColorToken from CSS variable name and theme value
 */
function createColorToken(cssVar: string, themeValue?: string): ColorToken {
  const value = themeValue || getCSSVar(cssVar);

  if (!value) {
    throw new Error(
      `createColorToken: No value for ${cssVar}. Ensure theme is loaded before accessing colors.`
    );
  }

  let rgb = "";
  try {
    rgb = hexToRgb(value);
  } catch {
    // Some derived tokens (e.g., color-mix) are not hex; keep rgb empty.
    rgb = "";
  }

  return {
    cssVar,
    value,
    rgb,
  };
}

/**
 * Composable for reactive theme color scheme access
 *
 * @example
 * ```vue
 * <script setup>
 * import { useColorScheme } from '@/composables/useColorScheme'
 *
 * const { tokens, getToken } = useColorScheme()
 *
 * // Access background color
 * const bgColor = tokens.value.bg0.value
 *
 * // Get specific token
 * const accentToken = getToken('accent')
 * </script>
 * ```
 */
export function useColorScheme() {
  const { currentTheme } = useTheme();
  const colors = useColors();

  /**
   * All available color tokens with reactive updates
   * Throws error if theme is not loaded to prevent silent failures
   */
  const tokens = computed<ColorTokenMap>(() => {
    const theme = currentTheme.value;

    if (!theme?.colors) {
      throw new Error("useColorScheme: Theme is not loaded");
    }

    return {
      // Background tokens
      bg0: createColorToken("--bg0", theme.colors.bg0),
      bg1: createColorToken("--bg1", theme.colors.bg1),
      bg2: createColorToken("--bg2", theme.colors.bg2),
      bgPrimary: createColorToken("--bg-primary", theme.colors.bg0),
      bgSecondary: createColorToken("--bg-secondary", theme.colors.bg1),
      bgTertiary: createColorToken("--bg-tertiary", theme.colors.bg2),

      // Foreground tokens
      fg0: createColorToken("--fg0", theme.colors.fg0),
      fg1: createColorToken("--fg1", theme.colors.fg1),
      fgMuted: createColorToken("--fg-muted", theme.colors.fgMuted),
      textPrimary: createColorToken("--text-primary", theme.colors.types),
      textSecondary: createColorToken("--text-secondary", theme.colors.functions),
      textMuted: createColorToken("--text-muted"),

      // Accent tokens
      accent: createColorToken("--accent", theme.colors.accent),
      accentAlt: createColorToken("--accent", theme.colors.accent),

      // Semantic state tokens
      error: createColorToken("--error", theme.colors.error),
      warning: createColorToken("--color-warning", theme.colors.keywords),
      success: createColorToken("--color-success", theme.colors.strings),
      info: createColorToken("--color-info", theme.colors.accent),

      // Syntax highlighting tokens
      keywords: createColorToken("--syntax-keywords", theme.colors.keywords),
      types: createColorToken("--syntax-types", theme.colors.types),
      functions: createColorToken("--syntax-functions", theme.colors.functions),
      strings: createColorToken("--syntax-strings", theme.colors.strings),
      decorator: createColorToken("--syntax-decorator", theme.colors.decorator),
      syntaxError: createColorToken("--syntax-error", theme.colors.error),

      // App typography tokens (computed from semantic tokens in CSS)
      appTextPrimary: createColorToken("--app-text-primary", theme.colors.types),
      appTextStrong: createColorToken("--app-text-strong", theme.colors.keywords),
      // These are derived from semantic theme tokens to preserve fail-fast behavior
      appTextMuted: createColorToken("--app-text-muted"),
      appTextSubtle: createColorToken("--app-text-subtle"),

      // Border tokens (computed from semantic tokens in CSS)
      borderPrimary: createColorToken("--border-primary"),
      borderSecondary: createColorToken("--border-secondary"),
      borderColor: createColorToken("--border-color"),
    };
  });

  /**
   * Get a specific color token by name
   */
  const getToken = (name: keyof ColorTokenMap): ColorToken => {
    return tokens.value[name];
  };

  /**
   * Get raw color value by token name
   */
  const getColor = (name: keyof ColorTokenMap): string => {
    return tokens.value[name].value;
  };

  /**
   * Get RGB components by token name
   */
  const getRgb = (name: keyof ColorTokenMap): string => {
    return tokens.value[name].rgb;
  };

  return {
    // Reactive token map
    tokens,

    // Utilities
    getToken,
    getColor,
    getRgb,

    // Re-export colors composable for convenience
    colors,

    // Theme info
    currentTheme,
  };
}
