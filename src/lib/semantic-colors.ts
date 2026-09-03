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

import { type OkLch, oklch, toHex, withAlpha } from "./color.js";
import { solveForContrast } from "./contrast-solve.js";

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC HUE CONSTANTS (FIXED - never change with theme accent)
// ═══════════════════════════════════════════════════════════════════════════

export const SEMANTIC_HUES = {
  /** Error/Danger - Always red (~29°) */
  error: 29,

  /**
   * Warning/Caution - yellow (~85°).
   *
   * Was 60 degrees, which is orange, and only 31 degrees from the error hue.
   * Both colours solve to the same contrast target, so hue was the only thing
   * separating them and 31 degrees was not enough: they measured 0.072-0.093
   * apart, under the floor, in every mode except triadic and split-complementary
   * -- the two whose harmony shifts happened to open the gap to ~55 degrees.
   * Those two modes measured zero collisions, which is what identified the base
   * hue rather than the shifts as the problem.
   *
   * 85 degrees is squarely in this module's own yellow band (85-100) and puts
   * 56 degrees between error and warning, matching the gap the working modes
   * already had.
   */
  warning: 85,

  /** Success/Passed/Added - Always green (~145°) */
  success: 145,

  /** Info/Hint - Always blue (~220°) */
  info: 220,
} as const;

/**
 * APCA Lc every semantic color must clear against the editor background.
 *
 * Deliberately a floor, not a goal. The shipped themes measured Lc 101-102 --
 * a 70% overshoot bought by spending essentially all of the color's chroma. On
 * a near-black background that overshoot is glare, which is a cost paid across
 * exactly the long sessions this theme exists for.
 */
export const SEMANTIC_TARGET_LC = 60;

/** Perceptual distance a semantic color must keep from the theme accent. */
const AVOID_FLOOR = 0.1;

/** Euclidean OKLCH distance. Local copy to avoid a circular import. */
function separationOf(a: OkLch, b: OkLch): number {
  const h1 = (a.h * Math.PI) / 180;
  const h2 = (b.h * Math.PI) / 180;
  const dl = a.l - b.l;
  const dc = a.c - b.c;
  const dh = 2 * Math.sqrt(a.c * b.c) * Math.sin((h1 - h2) / 2);
  return Math.sqrt(dl * dl + dc * dc + dh * dh);
}

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
 * Default semantic colors for dark themes.
 *
 * `lightness` is a starting point, not a promise -- `solveForContrast` moves it
 * to the nearest value that clears the contrast target. `chroma` is a CEILING:
 * the solver takes the lesser of it and whatever sRGB actually affords at the
 * solved lightness.
 *
 * These values were previously L 0.98 / C 0.6 for error and warning, chosen to
 * "guarantee readability." They guaranteed the opposite: at L 0.98 sRGB affords
 * a red about 0.010 of chroma, so both colors rendered as white. The values here
 * are the measured optimum -- the lowest lightness on a #0b0c10 background at
 * which each hue clears APCA Lc 60, and the chroma available there.
 */
export const DEFAULT_SEMANTIC_COLORS: SemanticColors = {
  error: {
    hue: SEMANTIC_HUES.error,
    lightness: 0.78,
    chroma: 0.16,
  },
  warning: {
    hue: SEMANTIC_HUES.warning,
    lightness: 0.78,
    chroma: 0.18,
  },
  success: {
    hue: SEMANTIC_HUES.success,
    lightness: 0.74,
    chroma: 0.24,
  },
  info: {
    hue: SEMANTIC_HUES.info,
    lightness: 0.75,
    chroma: 0.15,
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
  bg: OkLch = oklch(0.18, 0.03, 220),
  /**
   * Colors the result must stay perceptually clear of -- in practice the theme
   * accent.
   *
   * A seed picks its accent freely, and some land near a semantic hue: Aurora
   * Noir's teal-green accent measured 0.078 from its own green success colour,
   * and Eclipse's amber accent 0.070 from its warning. Both are under the floor,
   * so a reader could not tell the theme's own accent from a status indicator.
   *
   * The accent wins the hue argument -- it is what the seed was authored around
   * -- so the semantic colour yields instead, stepping along lightness while
   * keeping its hue. Contrast only ever increases, since the step moves away
   * from the background.
   */
  avoid: OkLch[] = []
): DerivedSemanticPalette {
  const bgHex = toHex(bg);
  const isDark = bg.l < 0.5;

  // Solve each semantic color for contrast WITHOUT surrendering its hue.
  //
  // The previous implementation walked lightness up in 0.06 steps while walking
  // chroma down by the same amount, then blended toward white if that failed.
  // Measured across all 50 shipped themes it drove error to chroma 0.013 and
  // warning to 0.017 -- both declared above 0.55 -- at APCA Lc 101 against a
  // target of 60. Error and warning ended 0.0026 apart in OKLCH: two colors that
  // are supposed to mean opposite things, rendered as the same white.
  //
  // The cause was directional. The sRGB chroma envelope peaks near L 0.60-0.65
  // and collapses above 0.85, so every step the loop took toward its contrast
  // target moved it further from any chroma it could keep. At L 0.98, the
  // lightness it settled on, sRGB affords a red a chroma of about 0.010.
  //
  // `solveForContrast` inverts this: it stops at the FIRST lightness clearing
  // the target and takes the most chroma available there. Same hue, same target,
  // Lc 61 instead of 101, chroma 0.129 instead of 0.013.
  const mkSemantic = (cfg: SemanticColorConfig): OkLch => {
    const solution = solveForContrast({
      hue: cfg.hue,
      backgroundHex: bgHex,
      targetLc: SEMANTIC_TARGET_LC,
      chromaCeiling: cfg.chroma,
      minL: isDark ? 0.45 : 0.2,
      maxL: isDark ? 0.95 : 0.6,
    });

    // `met: false` means no lightness in range cleared the target -- only
    // reachable on a background with very little headroom. Return the
    // best-contrast candidate found rather than a hardcoded near-white, so the
    // color keeps its identity and the separation gate can report the shortfall
    // instead of it being silently papered over.
    if (avoid.length === 0) return solution.color;

    // Step lightness until clear of everything in `avoid`, keeping the hue.
    let candidate = solution.color;
    for (let step = 0; step < 8; step++) {
      const tooClose = avoid.some(a => {
        const d = separationOf(candidate, a);
        return d > 0 && d < AVOID_FLOOR;
      });
      if (!tooClose) break;
      const l = Math.min(0.95, candidate.l + 0.05);
      if (l === candidate.l) break;
      candidate = solveForContrast({
        hue: cfg.hue,
        backgroundHex: bgHex,
        targetLc: SEMANTIC_TARGET_LC,
        chromaCeiling: cfg.chroma,
        minL: l,
        maxL: 0.95,
      }).color;
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

// ═══════════════════════════════════════════════════════════════════════════
// TERMINAL ANSI PALETTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fixed ANSI hues.
 *
 * These belong here, beside the other fixed-hue colors, rather than being taken
 * from the decorative wheel. The wheel's hues are offsets from the theme accent,
 * so on a teal-accented theme `terminal.ansiRed` was landing at 128 degrees --
 * emitting olive green for the colour a terminal uses to say a file was deleted
 * or a command failed. `ansiBlue` came out pink on the same theme.
 *
 * That is the wheel being used against its own documented contract: it is for
 * decorative and syntax use, where shifting with the accent is the point. ANSI
 * is semantic. A program writing red means red, the same way this module's error
 * colour does, and a reader cannot opt out of that convention because their
 * theme picked a teal accent.
 */
export const ANSI_HUES = {
  red: 29,
  green: 145,
  yellow: 90,
  blue: 250,
  magenta: 320,
  cyan: 195,
} as const;

export type AnsiColorName = keyof typeof ANSI_HUES;

export type DerivedAnsiPalette = Record<AnsiColorName, string> &
  Record<`${AnsiColorName}Bright`, string>;

/**
 * Derive the sixteen-colour ANSI range for a background.
 *
 * Normal colours are solved to `SEMANTIC_TARGET_LC`; bright colours to a higher
 * target, so "bright" is a real perceptual step rather than the duplicate hex
 * the theme was emitting for both halves of the range.
 */
export function deriveAnsiPalette(bg: OkLch): DerivedAnsiPalette {
  const bgHex = toHex(bg);
  const out = {} as DerivedAnsiPalette;

  for (const [name, hue] of Object.entries(ANSI_HUES) as [AnsiColorName, number][]) {
    out[name] = toHex(
      solveForContrast({ hue, backgroundHex: bgHex, targetLc: SEMANTIC_TARGET_LC }).color
    );
    out[`${name}Bright`] = toHex(
      solveForContrast({ hue, backgroundHex: bgHex, targetLc: SEMANTIC_TARGET_LC + 18 }).color
    );
  }

  return out;
}
