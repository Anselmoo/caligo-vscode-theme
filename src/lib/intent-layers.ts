/**
 * Intent Layer Engine - Revolutionary VS Code Theme Coloring
 *
 * Inspired by Microsoft Visual Studio 2026's intent-first tokens approach.
 * Colors represent what code DOES, not what syntax category it IS.
 *
 * Intent Layers:
 * - DECLARATION: Where things are created (high saturation, prominent)
 * - MUTATION: Where state changes (warm hues, attention-grabbing)
 * - USAGE: Where things are read (cool/muted, passive)
 * - CONTROL_FLOW: Logic and branching (distinct hue, separate mental track)
 * - DATA: Constants, literals (subtle, background information)
 *
 * @see https://learn.microsoft.com/en-us/visualstudio/extensibility/migration/modernize-theme-colors
 */

import { type OkLch, oklch, toHex } from "./color.js";
import { getAvailableLanguages, getLanguageMapper } from "./language-mappings/index.js";

// ═══════════════════════════════════════════════════════════════════════════
// INTENT LAYER DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intent layers define the PURPOSE of code, not its syntax category.
 * This is the revolutionary shift from classical syntax highlighting.
 */
export const INTENT_LAYERS = {
  /** Where things are created - function/class/variable declarations */
  declaration: {
    l: 0.75, // High lightness for prominence
    chromaMultiplier: 1.2, // High saturation
    hueOffset: 0, // Base accent hue
    description: "Where things are created",
  },
  /** Where state changes - assignments, mutations, side effects */
  mutation: {
    l: 0.7,
    chromaMultiplier: 1.0,
    hueOffset: 30, // Warm shift (toward orange/red)
    description: "Where state changes",
  },
  /** Where things are read - variable usage, property access */
  usage: {
    l: 0.68,
    chromaMultiplier: 0.6, // Muted - less attention needed
    hueOffset: -30, // Cool shift (toward blue)
    description: "Where things are read",
  },
  /** Logic and branching - if/else, loops, control keywords */
  controlFlow: {
    l: 0.72,
    chromaMultiplier: 0.9,
    hueOffset: 120, // Distinct hue (triadic from accent)
    description: "Logic and branching",
  },
  /** Constants, literals - background information */
  data: {
    l: 0.65,
    chromaMultiplier: 0.5, // Very muted
    hueOffset: 180, // Complementary - distinct but subtle
    description: "Constants and literals",
  },
  /** Metadata and annotations - decorators, attributes, macros */
  meta: {
    l: 0.73,
    chromaMultiplier: 0.85,
    hueOffset: 240, // Distinct hue (complementary split)
    description: "Metadata and annotations",
  },
  /** Documentation - comments, docstrings */
  documentation: {
    l: 0.6,
    chromaMultiplier: 0.4, // Very muted
    hueOffset: -60, // Subtle cool tone
    description: "Documentation and comments",
  },
} as const;

export type IntentLayer = keyof typeof INTENT_LAYERS;

// ═══════════════════════════════════════════════════════════════════════════
// INTENT EMPHASIS MODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Different emphasis modes for different use cases.
 * Each mode adjusts the relative prominence of intent layers.
 */
export const INTENT_EMPHASIS_MODES = {
  /** Default balanced mode */
  balanced: {
    declaration: 1.0,
    mutation: 1.0,
    usage: 1.0,
    controlFlow: 1.0,
    data: 1.0,
    meta: 1.0,
    documentation: 1.0,
  },
  /** Emphasize declarations - good for code review */
  declaration: {
    declaration: 1.3,
    mutation: 0.9,
    usage: 0.7,
    controlFlow: 0.9,
    data: 0.8,
    meta: 0.85,
    documentation: 0.7,
  },
  /** Emphasize control flow - good for debugging/understanding logic */
  controlFlow: {
    declaration: 0.8,
    mutation: 0.9,
    usage: 0.7,
    controlFlow: 1.4,
    data: 0.7,
    meta: 0.8,
    documentation: 0.6,
  },
  /** Emphasize mutations - good for tracking state changes */
  mutation: {
    declaration: 0.8,
    mutation: 1.4,
    usage: 0.7,
    controlFlow: 0.9,
    data: 0.7,
    meta: 0.8,
    documentation: 0.6,
  },
} as const;

export type IntentEmphasis = keyof typeof INTENT_EMPHASIS_MODES;

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC TOKEN → INTENT LAYER MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maps VS Code semantic tokens to intent layers.
 * This is the revolutionary mapping - syntax categories → code intent.
 */
export const SEMANTIC_TOKEN_TO_INTENT: Record<string, IntentLayer> = {
  // DECLARATION LAYER - where things are created
  "class.declaration": "declaration",
  "function.declaration": "declaration",
  "method.declaration": "declaration",
  "variable.declaration": "declaration",
  "property.declaration": "declaration",
  "parameter.declaration": "declaration",
  "interface.declaration": "declaration",
  "type.declaration": "declaration",
  "enum.declaration": "declaration",
  "enumMember.declaration": "declaration",

  // For tokens without .declaration modifier, check if they're likely declarations
  class: "declaration", // Classes are typically declarations
  interface: "declaration",
  type: "declaration",
  enum: "declaration",
  struct: "declaration",
  "function.defaultLibrary": "declaration",

  // MUTATION LAYER - where state changes
  "variable.modification": "mutation",
  "property.modification": "mutation",
  operator: "mutation", // Most operators involve mutation (=, +=, etc.)

  // USAGE LAYER - where things are read
  variable: "usage",
  parameter: "usage",
  property: "usage",
  "variable.readonly": "usage",
  "property.readonly": "usage",
  enumMember: "usage",
  member: "usage",

  // CONTROL FLOW LAYER - logic and branching
  keyword: "controlFlow", // if, else, for, while, return, etc.
  "keyword.control": "controlFlow",
  "keyword.operator": "controlFlow",

  // DATA LAYER - constants and literals
  string: "data",
  number: "data",
  regexp: "data",
  "variable.constant": "data",
  constant: "data",

  // SPECIAL CASES
  function: "declaration", // Function names are typically declarations/definitions
  method: "usage", // Method calls are usage (method.declaration is declaration)
  decorator: "mutation", // Decorators modify behavior
  macro: "mutation",
  comment: "data", // Comments are background information
  "comment.documentation": "data",
  namespace: "declaration",
  module: "declaration",
  typeParameter: "declaration",
};

// ═══════════════════════════════════════════════════════════════════════════
// INTENT PALETTE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

export interface DerivedIntentPalette {
  /** Accent hue used as base */
  baseHue: number;
  /** Base chroma */
  baseChroma: number;
  /** Emphasis mode applied */
  emphasis: IntentEmphasis;

  /** Intent layer colors */
  declaration: string;
  mutation: string;
  usage: string;
  controlFlow: string;
  data: string;
  meta: string;
  documentation: string;

  /** Debug info with full OKLCH values */
  debug: {
    declaration: OkLch;
    mutation: OkLch;
    usage: OkLch;
    controlFlow: OkLch;
    data: OkLch;
    meta: OkLch;
    documentation: OkLch;
  };
}

/**
 * Normalize hue to 0-360 range.
 */
function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

/**
 * Derive intent-based palette from accent color.
 *
 * @param accentHue - Base hue from accent color (0-360)
 * @param accentChroma - Base chroma from accent color
 * @param emphasis - Which intent layer to emphasize
 */
export function deriveIntentPalette(
  accentHue: number,
  accentChroma: number = 0.15,
  emphasis: IntentEmphasis = "balanced"
): DerivedIntentPalette {
  const emphasisMultipliers = INTENT_EMPHASIS_MODES[emphasis];

  const mkColor = (layer: IntentLayer): OkLch => {
    const config = INTENT_LAYERS[layer];
    const emphasisMult = emphasisMultipliers[layer];

    const l = config.l * emphasisMult;
    const c = accentChroma * config.chromaMultiplier * emphasisMult;
    const h = normalizeHue(accentHue + config.hueOffset);

    // Clamp values to valid OKLCH ranges
    return oklch(Math.max(0, Math.min(1, l)), Math.max(0, Math.min(0.4, c)), h);
  };

  const declaration = mkColor("declaration");
  const mutation = mkColor("mutation");
  const usage = mkColor("usage");
  const controlFlow = mkColor("controlFlow");
  const data = mkColor("data");
  const meta = mkColor("meta");
  const documentation = mkColor("documentation");

  return {
    baseHue: accentHue,
    baseChroma: accentChroma,
    emphasis,

    declaration: toHex(declaration),
    mutation: toHex(mutation),
    usage: toHex(usage),
    controlFlow: toHex(controlFlow),
    data: toHex(data),
    meta: toHex(meta),
    documentation: toHex(documentation),

    debug: {
      declaration,
      mutation,
      usage,
      controlFlow,
      data,
      meta,
      documentation,
    },
  };
}

/**
 * Derive intent-based palette with harmony mode influence.
 *
 * This function applies harmony-derived hue offsets to intent layers,
 * ensuring that different harmony modes create dramatically different
 * color experiences (targeting ~90%+ color differentiation).
 *
 * @param accentHue - Base hue from accent color (0-360)
 * @param accentChroma - Base chroma from accent color
 * @param emphasis - Which intent layer to emphasize
 * @param harmonyOffsets - Harmony-derived offsets for each intent layer
 */
export function deriveIntentPaletteWithHarmony(
  accentHue: number,
  accentChroma: number = 0.15,
  emphasis: IntentEmphasis = "balanced",
  harmonyOffsets: {
    declaration: number;
    mutation: number;
    usage: number;
    controlFlow: number;
    data: number;
    meta: number;
  }
): DerivedIntentPalette {
  const emphasisMultipliers = INTENT_EMPHASIS_MODES[emphasis];

  const mkColor = (layer: IntentLayer): OkLch => {
    const config = INTENT_LAYERS[layer];
    const emphasisMult = emphasisMultipliers[layer];
    // Use harmony-derived offset instead of fixed intent layer offset
    const offset =
      layer in harmonyOffsets
        ? harmonyOffsets[layer as keyof typeof harmonyOffsets]
        : config.hueOffset;

    const l = config.l * emphasisMult;
    const c = accentChroma * config.chromaMultiplier * emphasisMult;
    const h = normalizeHue(accentHue + offset);

    // Clamp values to valid OKLCH ranges
    return oklch(Math.max(0, Math.min(1, l)), Math.max(0, Math.min(0.4, c)), h);
  };

  const declaration = mkColor("declaration");
  const mutation = mkColor("mutation");
  const usage = mkColor("usage");
  const controlFlow = mkColor("controlFlow");
  const data = mkColor("data");
  const meta = mkColor("meta");
  const documentation = mkColor("documentation");

  return {
    baseHue: accentHue,
    baseChroma: accentChroma,
    emphasis,

    declaration: toHex(declaration),
    mutation: toHex(mutation),
    usage: toHex(usage),
    controlFlow: toHex(controlFlow),
    data: toHex(data),
    meta: toHex(meta),
    documentation: toHex(documentation),

    debug: {
      declaration,
      mutation,
      usage,
      controlFlow,
      data,
      meta,
      documentation,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTENT-BASED SEMANTIC TOKEN COLORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate semantic token colors using intent-based mapping.
 * This replaces the syntax-based approach with intent-based coloring.
 * Now with language-specific intelligence via language mappers.
 */
export function deriveIntentSemanticTokenColors(
  palette: DerivedIntentPalette,
  fgMuted: string
): Record<string, string | { foreground?: string; fontStyle?: string }> {
  const getIntentColor = (token: string): string => {
    const intent = SEMANTIC_TOKEN_TO_INTENT[token];
    if (!intent) return palette.usage; // Default to usage for unknown tokens
    return palette[intent];
  };

  // Start with base semantic token colors (language-agnostic)
  const colors: Record<string, string | { foreground?: string; fontStyle?: string }> = {
    // TYPE-LIKE CONSTRUCTS → mostly DECLARATION
    class: getIntentColor("class"),
    interface: getIntentColor("interface"),
    type: getIntentColor("type"),
    enum: getIntentColor("enum"),
    typeParameter: getIntentColor("typeParameter"),
    struct: getIntentColor("struct"),

    // FUNCTION-LIKE → DECLARATION for definitions
    function: getIntentColor("function"),
    "function.declaration": getIntentColor("function.declaration"),
    "function.async": getIntentColor("function"),
    method: getIntentColor("method"),
    "method.declaration": getIntentColor("method.declaration"),
    "method.async": getIntentColor("method"),

    // VARIABLES → USAGE (reads) or DECLARATION (defines)
    variable: getIntentColor("variable"),
    parameter: getIntentColor("parameter"),
    "variable.readonly": getIntentColor("variable.readonly"),
    "variable.defaultLibrary": {
      foreground: getIntentColor("function.defaultLibrary"),
      fontStyle: "bold",
    },

    // PROPERTIES → USAGE
    property: getIntentColor("property"),
    "property.readonly": getIntentColor("property.readonly"),
    "property.declaration": getIntentColor("property.declaration"),
    enumMember: getIntentColor("enumMember"),

    // DECORATORS → MUTATION (they modify behavior)
    decorator: getIntentColor("decorator"),
    macro: getIntentColor("macro"),

    // KEYWORDS → CONTROL FLOW
    keyword: getIntentColor("keyword"),
    operator: getIntentColor("operator"),

    // NAMESPACES → DECLARATION
    namespace: getIntentColor("namespace"),
    module: getIntentColor("module"),

    // STRINGS/LITERALS → DATA
    string: getIntentColor("string"),
    number: getIntentColor("number"),
    regexp: getIntentColor("regexp"),

    // COMMENTS → DATA (muted)
    comment: {
      foreground: fgMuted,
      fontStyle: "italic",
    },
    "comment.documentation": {
      foreground: palette.data,
      fontStyle: "italic",
    },

    // SPECIAL MODIFIERS
    "*.deprecated": {
      foreground: fgMuted,
      fontStyle: "italic strikethrough",
    },
    "*.declaration": {
      fontStyle: "bold",
    },
  };

  // ═══════════════════════════════════════════════════════════════════════
  // DYNAMIC LANGUAGE-SPECIFIC OVERRIDES
  // ═══════════════════════════════════════════════════════════════════════

  // Dynamically generate language-specific token colors from language mappers
  for (const lang of getAvailableLanguages()) {
    const mapper = getLanguageMapper(lang);
    if (!mapper) continue;

    // For each mapping in the language mapper, generate a scoped token
    for (const [tokenPattern, rule] of Object.entries(mapper.mappings)) {
      const scopedToken = `${tokenPattern}:${lang}`;
      const intentColor = palette[rule.layer];

      // Apply font style if specified
      if (rule.fontStyle) {
        colors[scopedToken] = {
          foreground: intentColor,
          fontStyle: rule.fontStyle,
        };
      } else {
        colors[scopedToken] = intentColor;
      }
    }
  }

  return colors;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERCEPTUAL DISTANCE VALIDATION (ΔE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate approximate perceptual distance between two OKLCH colors.
 * Based on Euclidean distance in OKLCH space.
 *
 * JND (Just Noticeable Difference) in OKLCH ≈ 0.02
 * @see W3C CSS Color Module Level 4
 */
export function calculateDeltaE(color1: OkLch, color2: OkLch): number {
  const dl = color1.l - color2.l;
  const dc = color1.c - color2.c;

  // Convert hue to radians and calculate chroma-weighted hue difference
  const h1Rad = (color1.h * Math.PI) / 180;
  const h2Rad = (color2.h * Math.PI) / 180;
  const dh = 2 * Math.sqrt(color1.c * color2.c) * Math.sin((h1Rad - h2Rad) / 2);

  return Math.sqrt(dl * dl + dc * dc + dh * dh);
}

/**
 * Validate that all intent layer colors have sufficient perceptual distance.
 * Minimum ΔE should be >= 0.02 (JND threshold).
 */
export function validateIntentPaletteDistances(palette: DerivedIntentPalette): {
  valid: boolean;
  issues: string[];
} {
  const MIN_DELTA_E = 0.02;
  const issues: string[] = [];

  const layers: IntentLayer[] = [
    "declaration",
    "mutation",
    "usage",
    "controlFlow",
    "data",
    "meta",
    "documentation",
  ];

  for (let i = 0; i < layers.length; i++) {
    for (let j = i + 1; j < layers.length; j++) {
      const layer1 = layers[i];
      const layer2 = layers[j];
      const color1 = palette.debug[layer1];
      const color2 = palette.debug[layer2];

      const deltaE = calculateDeltaE(color1, color2);

      if (deltaE < MIN_DELTA_E) {
        issues.push(`${layer1} ↔ ${layer2}: ΔE=${deltaE.toFixed(4)} < ${MIN_DELTA_E} (JND)`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
