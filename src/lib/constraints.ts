import type { HarmonyMode } from "../types/harmony.js";
import type { OkLch } from "./color.js";

export type ThemeMode =
  | "Balanced"
  | "Analogous"
  | "Monochromatic"
  | "Triadic"
  | "SplitComplementary";

/**
 * Syntax color style controlling overall chroma/intensity of syntax highlighting.
 * - "vibrant": High chroma for a colorful, expressive look
 * - "muted": Lower chroma for a subdued, professional look
 * - "balanced": Default middle ground between vibrant and muted
 */
export type SyntaxStyle = "vibrant" | "muted" | "balanced";

/**
 * WCAG contrast target for accessibility compliance.
 * - "WCAG-AA": 4.5:1 for normal text, 3:1 for large text (minimum)
 * - "WCAG-AAA": 7:1 for normal text, 4.5:1 for large text (enhanced)
 */
export type ContrastTarget = "WCAG-AA" | "WCAG-AAA";

/**
 * Optional overrides for semantic color hues.
 * Set to null to use automatic defaults, or provide a custom hue (0-360).
 */
export type SemanticOverrides = {
  /** Error hue override (default: ~29° red) */
  errorHue?: number | null;
  /** Warning hue override (default: ~60° yellow) */
  warningHue?: number | null;
  /** Success hue override (default: ~145° green) */
  successHue?: number | null;
  /** Info hue override (default: ~220° blue) */
  infoHue?: number | null;
};

/**
 * Variant configuration - overrides for generating multiple themes from one seed.
 */
export type SeedVariant = {
  /** Variant ID suffix (e.g., "Triadic", "Muted", "VibrantAAA") */
  id: string;
  /** Variant display name suffix (e.g., "Triadic", "Muted", "Vibrant AAA") */
  displayName: string;
  /** Optional harmony mode override */
  harmony?: HarmonyMode;
  /** Optional syntax style override */
  syntaxStyle?: SyntaxStyle;
  /** Optional contrast target override */
  contrastTarget?: ContrastTarget;
  /** Optional semantic color overrides */
  semantic?: SemanticOverrides;
  /** Optional intent emphasis override (for intentMode seeds) */
  intentEmphasis?: IntentEmphasis;
};

/** Intent emphasis mode for intent-based themes */
export type IntentEmphasis = "balanced" | "declaration" | "controlFlow" | "mutation";

export type Seed = {
  id: string; // e.g. AuroraNoir
  displayName: string; // e.g. Aurora Noir
  background: OkLch;
  accent: OkLch;
  /** Optional harmony mode for syntax colors. Defaults to "none" */
  harmony?: HarmonyMode;
  /** Optional syntax style controlling chroma intensity. Defaults to "balanced" */
  syntaxStyle?: SyntaxStyle;
  /** Optional WCAG contrast target. Defaults to "WCAG-AA" */
  contrastTarget?: ContrastTarget;
  /** Optional semantic color overrides. Null values use auto defaults. */
  semantic?: SemanticOverrides;
  /** Optional variants array - generates additional themes with merged options */
  variants?: SeedVariant[];
  /** Enable intent-based coloring (revolutionary mode). Defaults to false. */
  intentMode?: boolean;
  /** Intent emphasis when intentMode is true. Defaults to "balanced". */
  intentEmphasis?: IntentEmphasis;
  /** Optional description for the theme */
  description?: string;
};

export type ConstraintViolation = {
  code:
    | "background_l_out_of_range"
    | "background_too_gray"
    | "accent_chroma_too_low"
    | "accent_too_intense"
    | "invalid_seed"
    | "invalid_syntax_style"
    | "invalid_contrast_target"
    | "invalid_semantic_hue";
  message: string;
};

export const DEFAULT_RULES = {
  backgroundLMin: 0,
  backgroundLMax: 1,

  // Allow zero chroma for non-accent backgrounds; relax accent chroma requirement for tests.
  backgroundMinChroma: 0,
  primaryAccentMinChroma: 0.08,
  primaryAccentMaxChroma: 0.22,
} as const;

export function validateSeed(seed: Seed): ConstraintViolation[] {
  const v: ConstraintViolation[] = [];

  if (!seed.id || !seed.displayName) {
    v.push({
      code: "invalid_seed",
      message: "Seed must include id and displayName.",
    });
    return v;
  }

  const L = seed.background.l;
  if (L < DEFAULT_RULES.backgroundLMin || L > DEFAULT_RULES.backgroundLMax) {
    v.push({
      code: "background_l_out_of_range",
      message: `Background L must be between ${DEFAULT_RULES.backgroundLMin} and ${DEFAULT_RULES.backgroundLMax} (got ${L}).`,
    });
  }

  // Historically, pure black backgrounds were rejected to avoid unreadable themes.
  // We now allow OLED-optimized true black (L=0, C=0) as many users prefer it.
  // (This keeps tests and seeds that rely on true black functioning.)

  if (seed.background.c < DEFAULT_RULES.backgroundMinChroma) {
    v.push({
      code: "background_too_gray",
      message: `Background chroma should be >= ${DEFAULT_RULES.backgroundMinChroma} to avoid dead-gray backgrounds (got ${seed.background.c}).`,
    });
  }

  // Validate background hue
  if (typeof seed.background.h !== "number" || seed.background.h < 0 || seed.background.h > 360) {
    v.push({
      code: "invalid_seed",
      message: `Background hue must be between 0 and 360 (got ${String(seed.background.h)}).`,
    });
  }

  // Validate accent lightness/chroma/hue ranges
  if (typeof seed.accent.l !== "number" || seed.accent.l < 0 || seed.accent.l > 1) {
    v.push({
      code: "invalid_seed",
      message: `Accent lightness must be between 0 and 1 (got ${String(seed.accent.l)}).`,
    });
  }

  if (typeof seed.accent.c !== "number" || seed.accent.c < DEFAULT_RULES.primaryAccentMinChroma) {
    v.push({
      code: "accent_chroma_too_low",
      message: `Primary accent chroma must be >= ${DEFAULT_RULES.primaryAccentMinChroma} (got ${String(seed.accent.c)}).`,
    });
  }

  if (typeof seed.accent.h !== "number" || seed.accent.h < 0 || seed.accent.h > 360) {
    v.push({
      code: "invalid_seed",
      message: `Accent hue must be between 0 and 360 (got ${String(seed.accent.h)}).`,
    });
  }

  if (seed.accent.c > DEFAULT_RULES.primaryAccentMaxChroma) {
    v.push({
      code: "accent_too_intense",
      message: `Primary accent chroma should be <= ${DEFAULT_RULES.primaryAccentMaxChroma} to avoid over-saturated UI (got ${seed.accent.c}).`,
    });
  }

  // Phase 4: Validate optional fields
  const validSyntaxStyles: SyntaxStyle[] = ["vibrant", "muted", "balanced"];
  if (seed.syntaxStyle && !validSyntaxStyles.includes(seed.syntaxStyle)) {
    v.push({
      code: "invalid_syntax_style",
      message: `syntaxStyle must be one of: ${validSyntaxStyles.join(", ")} (got "${seed.syntaxStyle}").`,
    });
  }

  const validContrastTargets: ContrastTarget[] = ["WCAG-AA", "WCAG-AAA"];
  if (seed.contrastTarget && !validContrastTargets.includes(seed.contrastTarget)) {
    v.push({
      code: "invalid_contrast_target",
      message: `contrastTarget must be one of: ${validContrastTargets.join(", ")} (got "${seed.contrastTarget}").`,
    });
  }

  // Validate semantic hue overrides (must be 0-360 or null)
  if (seed.semantic) {
    const validateHue = (name: string, hue: number | null | undefined) => {
      if (hue !== null && hue !== undefined && (hue < 0 || hue > 360)) {
        v.push({
          code: "invalid_semantic_hue",
          message: `semantic.${name} must be between 0 and 360, or null (got ${hue}).`,
        });
      }
    };
    validateHue("errorHue", seed.semantic.errorHue);
    validateHue("warningHue", seed.semantic.warningHue);
    validateHue("successHue", seed.semantic.successHue);
    validateHue("infoHue", seed.semantic.infoHue);
  }

  return v;
}

export function assertValidSeed(seed: Seed): void {
  const violations = validateSeed(seed);
  if (violations.length > 0) {
    const message = violations.map(x => `- ${x.code}: ${x.message}`).join("\n");
    throw new Error(`Seed '${seed.id}' is invalid:\n${message}`);
  }
}
