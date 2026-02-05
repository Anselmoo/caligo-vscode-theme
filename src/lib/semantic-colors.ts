/**
 * Semantic Color System for VS Code Themes
 *
 * This module defines fixed semantic color hues that remain constant regardless
 * of the theme's accent color. Users expect:
 *   - Errors to always be RED
 *   - Warnings to always be YELLOW/AMBER
 *   - Success/Passed to always be GREEN
 *   - Info to always be BLUE
 *
 * The lightness (L) and chroma (C) adapt based on the theme's background
 * to ensure proper contrast (WCAG AA minimum).
 *
 * OKLCH Hue Reference (approximate):
 *   Red:     20-35°
 *   Orange:  50-70°
 *   Yellow:  85-100°
 *   Green:   140-160°
 *   Cyan:    180-200°
 *   Blue:    220-260°
 *   Purple:  280-320°
 */

import { APCAcontrast, sRGBtoY } from "./apca-wrapper.js";
import { type OkLch, oklch, toHex, withAlpha } from "./color.js";

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC HUE CONSTANTS (FIXED - never change with theme accent)
// ═══════════════════════════════════════════════════════════════════════════

export const SEMANTIC_HUES = {
  /** Error/Danger - Always red (~29°) */
  error: 29,

  /** Warning/Caution - Always yellow/amber (~60°) */
  warning: 60,

  /** Success/Passed/Added - Always green (~145°) */
  success: 145,

  /** Info/Hint - Always blue (~220°) */
  info: 220,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC COLOR CONFIGURATION TYPE
// ═══════════════════════════════════════════════════════════════════════════

export type SemanticColorConfig = {
  /** Fixed hue in OKLCH (0-360) - DO NOT derive from accent */
  hue: number;
  /** Base lightness for foreground use (0-1) */
  lightness: number;
  /** Base chroma/saturation (0-0.4 typical for OKLCH) */
  chroma: number;
};

export type SemanticColors = {
  error: SemanticColorConfig;
  warning: SemanticColorConfig;
  success: SemanticColorConfig;
  info: SemanticColorConfig;
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT SEMANTIC COLOR CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default semantic colors optimized for dark themes.
 * L/C values chosen for:
 *   - WCAG AA contrast on dark backgrounds (L ~0.18-0.22)
 *   - Perceptual vibrancy without being jarring
 *   - Consistency across all Caligo variants
 */
export const DEFAULT_SEMANTIC_COLORS: SemanticColors = {
  error: {
    hue: SEMANTIC_HUES.error,
    // Very bright and saturated to guarantee readability on dark backgrounds
    lightness: 0.98,
    chroma: 0.6,
  },
  warning: {
    hue: SEMANTIC_HUES.warning,
    // Very bright and saturated to guarantee readability on dark backgrounds
    lightness: 0.98,
    chroma: 0.55,
  },
  success: {
    hue: SEMANTIC_HUES.success,
    lightness: 0.68,
    chroma: 0.16,
  },
  info: {
    hue: SEMANTIC_HUES.info,
    lightness: 0.7,
    chroma: 0.14,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DERIVED SEMANTIC PALETTE
// ═══════════════════════════════════════════════════════════════════════════

export type DerivedSemanticPalette = {
  // OKLCH values for debugging/tracing
  debug: {
    error: OkLch;
    errorMuted: OkLch;
    warning: OkLch;
    warningMuted: OkLch;
    success: OkLch;
    successMuted: OkLch;
    info: OkLch;
    infoMuted: OkLch;
  };

  // Hex values for theme generation
  error: string;
  errorMuted: string;
  errorBg: string;
  warning: string;
  warningMuted: string;
  warningBg: string;
  success: string;
  successMuted: string;
  successBg: string;
  info: string;
  infoMuted: string;
  infoBg: string;
};

/**
 * Derive semantic colors from configuration, adapting L/C for the background.
 *
 * @param config - Semantic color configuration
 * @param bgLightness - Background lightness (0-1) to compute contrast
 */
export function deriveSemanticPalette(
  config: SemanticColors = DEFAULT_SEMANTIC_COLORS,
  bg: OkLch = oklch(0.18, 0.03, 220)
): DerivedSemanticPalette {
  const bgHex = toHex(bg);
  const isDark = bg.l < 0.5;

  // Helper to convert hex to integer RGB tuple for APCA
  const hexToRgb = (hex: string): [number, number, number] => {
    const cleaned = hex.replace("#", "").slice(0, 6);
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    return [r, g, b];
  };

  // Helper to create a semantic color with proper contrast and adjust if needed
  const mkSemantic = (cfg: SemanticColorConfig): OkLch => {
    // Adjust lightness based on background for contrast.
    let l = cfg.lightness;
    if (isDark && l < 0.9) l = 0.9; // Stronger boost for dark backgrounds
    if (!isDark && l > 0.5) l = 0.35; // Reduce for light backgrounds

    // Increase chroma more aggressively on dark backgrounds to meet contrast targets
    let c = isDark ? Math.min(cfg.chroma * 1.8, 0.7) : cfg.chroma;

    // Additional role-specific boost for error/warning hues which are APCA-sensitive
    if (isDark && (cfg.hue === SEMANTIC_HUES.error || cfg.hue === SEMANTIC_HUES.warning)) {
      l = Math.max(l, 0.92);
      c = Math.min(c * 1.15, 0.75);
    }

    // Start with computed OKLCH
    let candidate = oklch(l, c, cfg.hue);
    let hex = toHex(candidate);

    // Measure APCA contrast and incrementally increase lightness until
    // we meet the minimum target for semantic colors (60) or reach near-white.
    const target = 60;
    let fgY = sRGBtoY(hexToRgb(hex));
    const bgY = sRGBtoY(hexToRgb(bgHex));
    let contrast = Math.abs(APCAcontrast(fgY, bgY));

    let tries = 0;
    while (contrast < target && tries < 12 && candidate.l < 0.995) {
      // Gradually move the color towards a lighter, slightly desaturated tint
      // (more 'pink' for red hues) which tends to increase APCA contrast on
      // dark backgrounds.
      candidate = oklch(
        Math.min(0.995, candidate.l + 0.06),
        Math.max(0.01, candidate.c - 0.06),
        candidate.h
      );
      hex = toHex(candidate);
      fgY = sRGBtoY(hexToRgb(hex));
      contrast = Math.abs(APCAcontrast(fgY, bgY));
      tries += 1;
    }

    // If we still haven't reached the target contrast, blend towards white
    // in sRGB space which is a pragmatic last-resort to guarantee legibility.
    if (contrast < target) {
      const origRgb = hexToRgb(hex);
      let alpha = 0.1;
      while (contrast < target && alpha <= 1.0) {
        const blended: [number, number, number] = [
          Math.round(origRgb[0] + (255 - origRgb[0]) * alpha),
          Math.round(origRgb[1] + (255 - origRgb[1]) * alpha),
          Math.round(origRgb[2] + (255 - origRgb[2]) * alpha),
        ];
        fgY = sRGBtoY(blended);
        contrast = Math.abs(APCAcontrast(fgY, bgY));
        if (contrast >= target) {
          // Represent blended color as an OkLch approximation for debug; use
          // the blended RGB converted back through culori for a stable hex.
          const approx = oklch(0.98, 0.02, cfg.hue);
          return approx;
        }
        alpha += 0.15;
      }
    }

    return candidate;
  };

  // Muted version: reduced chroma, slightly different lightness
  const mkMuted = (cfg: SemanticColorConfig): OkLch => {
    const l = isDark ? cfg.lightness - 0.1 : cfg.lightness + 0.1;
    return oklch(Math.max(0.3, Math.min(0.9, l)), cfg.chroma * 0.6, cfg.hue);
  };

  // Background version: very low lightness, low chroma (for highlights)
  const mkBg = (cfg: SemanticColorConfig): string => {
    const l = isDark ? Math.min(0.95, bg.l + 0.08) : Math.max(0.05, bg.l - 0.08);
    const c = Math.max(0, cfg.chroma * 0.3);
    const color = oklch(l, c, cfg.hue);
    return withAlpha(toHex(color), 0.25);
  };

  const error = mkSemantic(config.error);
  const errorMuted = mkMuted(config.error);
  const warning = mkSemantic(config.warning);
  const warningMuted = mkMuted(config.warning);
  const success = mkSemantic(config.success);
  const successMuted = mkMuted(config.success);
  const info = mkSemantic(config.info);
  const infoMuted = mkMuted(config.info);

  return {
    debug: {
      error,
      errorMuted,
      warning,
      warningMuted,
      success,
      successMuted,
      info,
      infoMuted,
    },

    error: toHex(error),
    errorMuted: toHex(errorMuted),
    errorBg: mkBg(config.error),
    warning: toHex(warning),
    warningMuted: toHex(warningMuted),
    warningBg: mkBg(config.warning),
    success: toHex(success),
    successMuted: toHex(successMuted),
    successBg: mkBg(config.success),
    info: toHex(info),
    infoMuted: toHex(infoMuted),
    infoBg: mkBg(config.info),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// VS CODE COLOR KEY MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete mapping of VS Code color keys to semantic meanings.
 * This ensures ALL error-related keys use our semantic.error color, etc.
 */
export const SEMANTIC_COLOR_KEYS = {
  error: [
    // Base
    "errorForeground",

    // Editor
    "editorError.foreground",
    "editorError.border",
    "editorError.background",

    // Overview ruler
    "editorOverviewRuler.errorForeground",

    // Problems panel
    "problemsErrorIcon.foreground",

    // Minimap
    "minimap.errorHighlight",

    // Lists
    "list.errorForeground",

    // Input validation
    "inputValidation.errorForeground",
    "inputValidation.errorBorder",
    "inputValidation.errorBackground",

    // Activity bar badges
    "activityErrorBadge.foreground",
    "activityErrorBadge.background",

    // Status bar
    "statusBarItem.errorForeground",
    "statusBarItem.errorBackground",
    "statusBarItem.errorHoverForeground",
    "statusBarItem.errorHoverBackground",

    // Notifications
    "notificationsErrorIcon.foreground",

    // Editor marker navigation
    "editorMarkerNavigationError.background",
    "editorMarkerNavigationError.headerBackground",

    // Testing
    "testing.iconErrored",
    "testing.iconFailed",
    "testing.iconErrored.retired",
    "testing.iconFailed.retired",
    "testing.message.error.lineBackground",
    "testing.message.error.badgeBackground",
    "testing.message.error.badgeForeground",
    "testing.message.error.badgeBorder",

    // Debug console
    "debugConsole.errorForeground",

    // Terminal command decoration
    "terminalCommandDecoration.errorBackground",

    // Gauge
    "gauge.errorForeground",
    "gauge.errorBackground",

    // Git (deleted = error-like)
    "gitDecoration.deletedResourceForeground",

    // Diff removed
    "diffEditor.removedTextBackground",
    "diffEditor.removedTextBorder",
    "diffEditor.removedLineBackground",
    "diffEditorGutter.removedLineBackground",
    "diffEditorOverview.removedForeground",

    // Chat
    "chat.linesRemovedForeground",
  ],

  warning: [
    // Editor
    "editorWarning.foreground",
    "editorWarning.border",
    "editorWarning.background",

    // Overview ruler
    "editorOverviewRuler.warningForeground",

    // Problems panel
    "problemsWarningIcon.foreground",

    // Minimap
    "minimap.warningHighlight",

    // Lists
    "list.warningForeground",

    // Input validation
    "inputValidation.warningForeground",
    "inputValidation.warningBorder",
    "inputValidation.warningBackground",

    // Activity bar badges
    "activityWarningBadge.foreground",
    "activityWarningBadge.background",

    // Status bar
    "statusBarItem.warningForeground",
    "statusBarItem.warningBackground",
    "statusBarItem.warningHoverForeground",
    "statusBarItem.warningHoverBackground",

    // Notifications
    "notificationsWarningIcon.foreground",

    // Editor marker navigation
    "editorMarkerNavigationWarning.background",
    "editorMarkerNavigationWarning.headerBackground",

    // Debug console
    "debugConsole.warningForeground",

    // Gauge
    "gauge.warningForeground",
    "gauge.warningBackground",

    // Git (modified = warning-like in some contexts)
    "gitDecoration.modifiedResourceForeground",

    // Diff modified
    "editorOverviewRuler.modifiedForeground",
    "editorGutter.modifiedBackground",
    "minimapGutter.modifiedBackground",

    // Markdown alerts
    "markdownAlert.warning.foreground",
    "markdownAlert.caution.foreground",
  ],

  success: [
    // Testing
    "testing.iconPassed",
    "testing.iconPassed.retired",

    // Terminal command decoration
    "terminalCommandDecoration.successBackground",

    // Git (added = success)
    "gitDecoration.addedResourceForeground",
    "gitDecoration.stageModifiedResourceForeground",

    // Diff added
    "diffEditor.insertedTextBackground",
    "diffEditor.insertedTextBorder",
    "diffEditor.insertedLineBackground",
    "diffEditorGutter.insertedLineBackground",
    "diffEditorOverview.insertedForeground",
    "editorOverviewRuler.addedForeground",
    "editorGutter.addedBackground",
    "minimapGutter.addedBackground",

    // Inline edit success
    "inlineEdit.gutterIndicator.successfulForeground",
    "inlineEdit.gutterIndicator.successfulBackground",
    "inlineEdit.gutterIndicator.successfulBorder",

    // Chat
    "chat.linesAddedForeground",

    // Markdown alerts
    "markdownAlert.tip.foreground",

    // Testing coverage
    "testing.coveredBackground",
    "testing.coveredBorder",
    "testing.coveredGutterBackground",
  ],

  info: [
    // Editor
    "editorInfo.foreground",
    "editorInfo.border",
    "editorInfo.background",

    // Editor hint
    "editorHint.foreground",
    "editorHint.border",

    // Overview ruler
    "editorOverviewRuler.infoForeground",

    // Problems panel
    "problemsInfoIcon.foreground",

    // Minimap
    "minimap.infoHighlight",

    // Input validation
    "inputValidation.infoForeground",
    "inputValidation.infoBorder",
    "inputValidation.infoBackground",

    // Notifications
    "notificationsInfoIcon.foreground",

    // Editor marker navigation
    "editorMarkerNavigationInfo.background",
    "editorMarkerNavigationInfo.headerBackground",

    // Debug console
    "debugConsole.infoForeground",

    // Testing
    "testing.iconQueued",
    "testing.iconSkipped",
    "testing.iconUnset",
    "testing.iconQueued.retired",
    "testing.iconSkipped.retired",
    "testing.iconUnset.retired",
    "testing.message.info.lineBackground",
    "testing.message.info.decorationForeground",

    // Markdown alerts
    "markdownAlert.note.foreground",
    "markdownAlert.important.foreground",
  ],
} as const;

/**
 * Helper to get all semantic color keys flattened
 */
export function getAllSemanticColorKeys(): string[] {
  return [
    ...SEMANTIC_COLOR_KEYS.error,
    ...SEMANTIC_COLOR_KEYS.warning,
    ...SEMANTIC_COLOR_KEYS.success,
    ...SEMANTIC_COLOR_KEYS.info,
  ];
}
