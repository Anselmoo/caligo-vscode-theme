import { type OkLch, oklch, toHex, withAlpha } from "./color.js";
import type {
  ContrastTarget,
  Seed,
  SemanticOverrides,
  SyntaxStyle,
  ThemeMode,
} from "./constraints.js";
import {
  type DerivedHarmonyPalette,
  deriveHarmonyAccentShift,
  deriveHarmonyDecorativeWheel,
  deriveHarmonyIntentOffsets,
  deriveHarmonyPalette,
  deriveHarmonySemanticHues,
  type HarmonyMode,
} from "./harmony-colors.js";
import { type DerivedIntentPalette, deriveIntentPaletteWithHarmony } from "./intent-layers.js";
import {
  DEFAULT_SEMANTIC_COLORS,
  type DerivedAnsiPalette,
  type DerivedSemanticPalette,
  deriveAnsiPalette,
  deriveSemanticPalette,
  type SemanticColors,
} from "./semantic-colors.js";
import {
  DECORATIVE_LADDER,
  type DecorativeHue,
  fitRungs,
  type LadderRole,
  placeOnLadder,
  SINGLE_INK_PRESENTATION,
} from "./separation-ladder.js";

/** The nine syntax roles the shared budget allocates, in priority order. */
const SYNTAX_ROLE_IDS = [
  "keywords",
  "functions",
  "strings",
  "types",
  "numbers",
  "variables",
  "constants",
  "tags",
  "attributes",
] as const satisfies readonly LadderRole[];

import { allocateSharedBudget } from "./shared-budget.js";

/**
 * Chroma multipliers for different syntax styles.
 * Applied to decorative hue wheel colors.
 */
const SYNTAX_CHROMA_MULTIPLIERS: Record<SyntaxStyle, number> = {
  vibrant: 1.25,
  balanced: 1.0,
  muted: 0.7,
};

/**
 * Lightness adjustments for contrast targets.
 * WCAG-AAA requires higher contrast, so we boost foreground lightness.
 */
const CONTRAST_L_BOOST: Record<ContrastTarget, number> = {
  "WCAG-AA": 0,
  "WCAG-AAA": 0.05,
};

/**
 * Build a SemanticColors config with harmony-shifted hues.
 *
 * Scientific rationale: Semantic colors (error/warning/success/info) traditionally
 * use fixed hues. By applying harmony-based shifts while staying within
 * recognizable color ranges, we achieve ~28% more differentiation between modes.
 *
 * @param overrides - Optional manual hue overrides from seed
 * @param harmonyMode - Harmony mode to apply shifts
 */
function buildSemanticConfig(
  overrides: SemanticOverrides | undefined,
  harmonyMode: HarmonyMode
): SemanticColors {
  const base = DEFAULT_SEMANTIC_COLORS;
  const harmonyHues = deriveHarmonySemanticHues(harmonyMode);

  return {
    error: {
      ...base.error,
      hue: overrides?.errorHue ?? harmonyHues.error,
    },
    warning: {
      ...base.warning,
      hue: overrides?.warningHue ?? harmonyHues.warning,
    },
    success: {
      ...base.success,
      hue: overrides?.successHue ?? harmonyHues.success,
    },
    info: {
      ...base.info,
      hue: overrides?.infoHue ?? harmonyHues.info,
    },
  };
}

export type DerivedPalette = {
  seed: Seed;
  mode: ThemeMode;

  // Debug/trace info (kept in build artifacts; helps explain where colors come from).
  debug: {
    oklch: {
      bg0: OkLch;
      bg1: OkLch;
      bg2: OkLch;
      fg0: OkLch;
      fg1: OkLch;
      fgMuted: OkLch;
      accent: OkLch;
      accentSoft: OkLch;
      accentMuted: OkLch;
      accentSubtle: OkLch;
      // Decorative hue wheel (for syntax highlighting, NOT semantic meaning)
      hueRed: OkLch;
      hueOrange: OkLch;
      hueYellow: OkLch;
      hueGreen: OkLch;
      hueCyan: OkLch;
      hueBlue: OkLch;
      huePurple: OkLch;
      border: OkLch;
      selectionBase: OkLch;
    };
    selectionAlpha: number;
    harmonyMode: HarmonyMode;
    // Phase 4 options
    syntaxStyle: SyntaxStyle;
    contrastTarget: ContrastTarget;
    chromaMultiplier: number;
    lightnessBoost: number;
  };

  // Surfaces
  bg0: string; // editor background
  bg1: string; // elevated surface (sidebar/panel)
  bg2: string; // further elevated

  // Text
  fg0: string;
  fg1: string;
  fgMuted: string;

  // Accents
  accent: string;
  accentSoft: string; // softer accent for UI text/icons
  accentMuted: string; // muted accent for subtle emphasis
  accentSubtle: string; // dark-twin accent for backgrounds/highlights

  // Decorative hue wheel (for syntax highlighting - can shift with accent)
  hueRed: string;
  hueOrange: string;
  hueYellow: string;
  hueGreen: string;
  hueCyan: string;
  hueBlue: string;
  huePurple: string;

  // Terminal ANSI, on FIXED hues. Never derived from the decorative wheel:
  // a program writing red means red regardless of the theme's accent.
  ansi: DerivedAnsiPalette;

  // SEMANTIC colors (FIXED hues - never shift with accent!)
  semantic: DerivedSemanticPalette;

  // HARMONY colors (when harmony mode is enabled)
  harmony: DerivedHarmonyPalette;

  /**
   * Six nesting colours for bracket-pair highlighting.
   *
   * Their own surface, not the decorative wheel. Brackets render INSIDE the
   * same line as code, so they compete with syntax roles directly -- and while
   * they were wheel colours, every one of the 50 themes painted at least one
   * bracket in the byte-identical colour of a syntax role (259 exact matches
   * across the matrix). Allocating them separately, with the syntax inks
   * reserved, keeps the decorative wheel untouched for the markup and git
   * scopes it actually serves.
   */
  brackets: string[];

  /**
   * Per-role weight and slope, populated only for a single-hue theme.
   *
   * Empty for every other mode: hue carries role identity there, and adding
   * italics on top would be decoration rather than information.
   */
  syntaxEmphasis: Partial<Record<string, "italic" | "bold" | "bold italic">>;

  // INTENT colors (when intentEmphasis is enabled)
  intent?: DerivedIntentPalette;

  // UI helpers
  border: string;
  selection: string;
};

function shiftL(base: OkLch, delta: number): OkLch {
  return { ...base, l: base.l + delta };
}

function tintText(baseHue: number, l: number, c: number): OkLch {
  return oklch(l, c, baseHue);
}

export function derivePalette(seed: Seed, mode: ThemeMode): DerivedPalette {
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4 OPTIONS: Extract expanded seed options with defaults
  // ═══════════════════════════════════════════════════════════════════════════
  const syntaxStyle: SyntaxStyle = seed.syntaxStyle ?? "balanced";
  const contrastTarget: ContrastTarget = seed.contrastTarget ?? "WCAG-AA";
  const chromaMult = SYNTAX_CHROMA_MULTIPLIERS[syntaxStyle];
  const lBoost = CONTRAST_L_BOOST[contrastTarget];

  // Base surfaces: keep a slight tint (C>0) to avoid "dead gray".
  const bg0 = seed.background;
  // More separation between layers so UI isn't a single flat slab.
  const bg1 = shiftL(bg0, 0.02);
  const bg2 = shiftL(bg0, 0.04);

  // Text: near-neutral but gently aligned to base hue.
  // Increase chroma a bit so "foreground" doesn't read as plain gray/white.
  // Still keep it subtle to avoid a "light theme" look.
  // Apply contrast boost for WCAG-AAA compliance when requested.
  const fg0 = tintText(bg0.h, Math.min(0.95, 0.86 + lBoost), 0.03);
  const fg1 = tintText(bg0.h, Math.min(0.92, 0.76 + lBoost), 0.028);
  const fgMuted = tintText(bg0.h, Math.min(0.85, 0.66 + lBoost), 0.026);

  // Semantic accents. Keep L high enough to stay vivid on dark backgrounds, but
  // not neon.
  // ═══════════════════════════════════════════════════════════════════════════
  // HARMONY-SHIFTED UI ACCENT
  //
  // Scientific rationale: UI accent colors (focus borders, selections, badges,
  // cursors) represent ~15% of a theme's visual identity. By shifting the accent
  // hue based on harmony mode, we create distinctly different UI experiences.
  //
  // Each harmony mode applies a scientifically-grounded hue shift:
  // - NONE: No shift (original accent)
  // - ANALOGOUS: -15° shift (cooler, within ±30° band)
  // - TRIADIC: +60° shift (toward secondary harmony position)
  // - SPLIT-COMPLEMENTARY: +75° shift (toward complement region)
  // - MONOCHROMATIC: 0° shift, but boosted chroma (the "one vivid color")
  // ═══════════════════════════════════════════════════════════════════════════
  const harmonyMode = seed.harmony ?? "none";
  const accentShift = deriveHarmonyAccentShift(harmonyMode);
  const normalizeHue = (h: number) => ((h % 360) + 360) % 360;

  // Apply harmony shift to create the UI accent
  const accent = oklch(
    Math.max(0.5, Math.min(0.85, seed.accent.l + accentShift.lightnessAdjust)),
    Math.max(0.08, Math.min(0.22, seed.accent.c * accentShift.chromaMultiplier)),
    normalizeHue(seed.accent.h + accentShift.hueOffset)
  );

  // Accent ramps (“dark twins”): use these for selections, badges, subtle
  // backgrounds, and non-editor UI so we avoid throwing bright neon everywhere.
  const accentSoft = oklch(
    Math.min(0.76, accent.l + 0.06),
    Math.min(accent.c * 0.85, 0.16),
    accent.h
  );
  const accentMuted = oklch(
    Math.min(0.7, accent.l + 0.02),
    Math.min(accent.c * 0.55, 0.12),
    accent.h
  );
  const accentSubtle = oklch(bg2.l, Math.min(accent.c * 0.35, 0.08), accent.h);

  // ═══════════════════════════════════════════════════════════════════════════
  // HARMONY-INFLUENCED DECORATIVE HUE WHEEL
  //
  // Scientific rationale: Classic themes use fixed hue offsets from accent,
  // ignoring color theory. Harmony modes apply classic color relationships:
  //
  // - ANALOGOUS: All hues cluster within ±30° of accent → calm, unified
  // - TRIADIC: Three hues at 0°, 120°, 240° → vibrant, balanced
  // - SPLIT-COMPLEMENTARY: Base + 150° + 210° → high contrast, less jarring
  // - MONOCHROMATIC: Single hue, vary L/C → minimal, focused
  //
  // This ensures ~90%+ color differentiation between harmony modes because
  // the fundamental hue relationships change, not just syntax colors.
  // ═══════════════════════════════════════════════════════════════════════════
  const harmonyWheel = deriveHarmonyDecorativeWheel(accent.h, harmonyMode);

  // Place the wheel on its own ladder rather than on seven hand-picked
  // lightness values.
  //
  // The previous constants spanned 0.74-0.86 with green and cyan both at 0.80,
  // and gave every member a chroma of `Math.max(accent.c * k, 0.14)` -- which
  // is near enough to constant that hue was doing all the separating. That held
  // up in `none` mode and collapsed everywhere the hue span narrowed: in a
  // single-hue theme these were seven copies of one color, and they were the
  // source of every worst-measuring pair left after the syntax ladder landed
  // (Markup Links against Regex Escapes, String Escapes against Storage
  // Imports, and so on).
  //
  // `placeOnLadder` also means the wheel now clears the readability floor by
  // construction instead of by the hand-tuned lightness bumps these constants
  // had accreted for terminal contrast.
  const bg0Hex = toHex(bg0);

  // Order matters: members adjacent in this list are the ones that merge when
  // the hue span is too narrow to keep them all apart. Hue-adjacent members are
  // deliberately NOT adjacent here, so a merge folds together colours that were
  // already close rather than collapsing red into orange first.
  const WHEEL_ORDER = [
    "huePurple",
    "hueRed",
    "hueCyan",
    "hueYellow",
    "hueOrange",
    "hueBlue",
    "hueGreen",
  ] as const satisfies readonly DecorativeHue[];

  const wheelHues = WHEEL_ORDER.map(k => ((harmonyWheel[k] % 360) + 360) % 360);
  const wheelBounds = {
    lMin: Math.min(...WHEEL_ORDER.map(k => DECORATIVE_LADDER[k].l)),
    lMax: Math.max(...WHEEL_ORDER.map(k => DECORATIVE_LADDER[k].l)),
    cMin: Math.min(...WHEEL_ORDER.map(k => DECORATIVE_LADDER[k].chromaCeiling)) * chromaMult,
    cMax: Math.max(...WHEEL_ORDER.map(k => DECORATIVE_LADDER[k].chromaCeiling)) * chromaMult,
  };
  const wheelFit = fitRungs(wheelHues, bg0Hex, wheelBounds);

  const wheelColors = {} as Record<DecorativeHue, OkLch>;
  WHEEL_ORDER.forEach((key, i) => {
    wheelColors[key] = placeOnLadder(wheelFit[i].rung, wheelFit[i].hue, bg0Hex).color;
  });

  const { hueRed, hueOrange, hueYellow, hueGreen, hueCyan, hueBlue, huePurple } = wheelColors;

  // ═══════════════════════════════════════════════════════════════════════════
  // HARMONY-SHIFTED SEMANTIC COLORS
  //
  // Scientific rationale: Semantic colors traditionally use FIXED hues
  // (error=red, warning=yellow, success=green, info=blue). By applying
  // harmony-based shifts while staying within recognizable color ranges,
  // we achieve ~28% more differentiation between harmony modes (~100 lines).
  //
  // Each harmony mode shifts semantic hues within safe ranges:
  // - Error stays RED (15-45°), Warning stays YELLOW/ORANGE (40-80°)
  // - Success stays GREEN (130-170°), Info stays BLUE (200-260°)
  // ═══════════════════════════════════════════════════════════════════════════
  const semanticConfig = buildSemanticConfig(seed.semantic, harmonyMode);
  const semantic = deriveSemanticPalette(semanticConfig, bg0, [accent, accentSoft, accentMuted]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HARMONY COLORS (for advanced syntax highlighting)
  // Uses color theory harmony modes when specified in seed
  // ═══════════════════════════════════════════════════════════════════════════
  const harmony = deriveHarmonyPalette(accent.h, harmonyMode, accent.c, toHex(bg0));

  // ═══════════════════════════════════════════════════════════════════════════
  // INTENT COLORS (revolutionary intent-based semantic coloring)
  // NOW HARMONY-AWARE: Uses harmony-derived hue offsets for intent layers
  // This ensures ~90%+ color differentiation between harmony modes
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED COLOUR BUDGET
  //
  // Up to this point the syntax ladder, the decorative wheel and the accent
  // variants have each been placed well WITHIN themselves and in ignorance of
  // each other. Measured, that left 88% of all remaining collisions between
  // layers rather than inside any one of them.
  //
  // This re-places all three against a single ledger, with the semantic palette
  // reserved: semantic colours are the ones a reader cannot opt out of, so they
  // spend from the budget first and everything else fits around them.
  //
  // Priority order below is a claim about what a reader most needs to tell
  // apart. Keywords, calls and strings lead; comments and operators are
  // deliberately near the end because they are meant to recede and are the
  // cheapest to fold; the decorative wheel and accent tints come last because
  // nothing about reading code depends on `hueOrange` differing from `hueRed`.
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED COLOUR BUDGET, SCOPED BY SURFACE
  //
  // Two colours need to be tellable apart only if a reader can see them at the
  // same time. Requiring all nineteen to differ from all the others solved a
  // harder problem than the product has: it drove the affordable palette down
  // to about seven colours and, at a single hue, to two.
  //
  // So the floor is applied per surface:
  //
  //   CODE  - the nine syntax roles. These render together in every source file
  //           and are what a reader scans, so they get the strictest treatment.
  //   DECOR - the seven decorative wheel colours, which drive markup, regex,
  //           git decorations and symbol icons. They occupy different scope
  //           families from the code roles and are told apart by position as
  //           much as by hue.
  //
  // Both surfaces are allocated against the same RESERVED set -- the semantic
  // four and the accent ramp -- because those appear over everything and a
  // reader cannot opt out of an error being distinguishable. What is no longer
  // required is that a markup heading differ from a keyword: they belong to
  // different surfaces, and forcing them apart was costing colour everywhere
  // for a collision almost nobody can be shown.
  // ═══════════════════════════════════════════════════════════════════════════
  // Only the semantic four. The accent ramp is deliberately absent: it is
  // chrome -- cursor, borders, selection, badges -- sitting beside code rather
  // than among it, and reserving it collapsed every single-hue theme, since
  // there the accent shares the syntax hue and nothing can get clear of it.
  // The semantic colours go the other way: `deriveSemanticPalette` already
  // steps them clear of the accent, so the accent is respected once, at the
  // layer that genuinely shares a surface with it.
  const reservedColors = [
    semantic.debug.error,
    semantic.debug.warning,
    semantic.debug.success,
    semantic.debug.info,
  ];

  // Priority order is a claim about what a reader most needs to pick out:
  // keywords, calls and strings lead, and the roles nobody distinguishes by
  // name fold first when the surface cannot afford them all.
  const codeBudget = allocateSharedBudget(
    [
      { id: "keywords", hue: harmony.roleHues.keywords },
      { id: "functions", hue: harmony.roleHues.functions },
      { id: "strings", hue: harmony.roleHues.strings },
      { id: "types", hue: harmony.roleHues.types },
      { id: "numbers", hue: harmony.roleHues.numbers },
      { id: "variables", hue: harmony.roleHues.variables },
      { id: "constants", hue: harmony.roleHues.constants },
      { id: "tags", hue: harmony.roleHues.tags },
      { id: "attributes", hue: harmony.roleHues.attributes },
    ],
    reservedColors,
    bg0Hex
  );

  const decorBudget = allocateSharedBudget(
    WHEEL_ORDER.map((key, i) => ({ id: key, hue: wheelFit[i].hue })),
    reservedColors,
    bg0Hex
  );

  // Brackets: a third surface, allocated against the syntax inks.
  //
  // Six evenly spaced hues around the wheel from the accent, so nesting depth
  // reads as a rotation rather than an arbitrary sequence, then placed with the
  // code surface reserved so a bracket can never take a syntax colour.
  //
  // Deliberately NOT done by constraining the decorative wheel itself: that was
  // measured to cost decor colours on two themes while still leaving exact
  // matches, because it forces one allocation to satisfy two surfaces at once.
  // A separate six-member surface costs the wheel nothing.
  const bracketBudget = allocateSharedBudget(
    Array.from({ length: 6 }, (_, i) => ({
      id: `bracket${i + 1}`,
      hue: (((accent.h + 60 * i) % 360) + 360) % 360,
    })),
    [...reservedColors, ...SYNTAX_ROLE_IDS.map(r => codeBudget.colors[r])],
    bg0Hex
  );

  const budget = {
    colors: { ...codeBudget.colors, ...decorBudget.colors },
    distinctCount: codeBudget.distinctCount,
    merged: [...codeBudget.merged, ...decorBudget.merged],
  };

  const budgeted = <T extends OkLch>(id: string, fallback: T): OkLch =>
    budget.colors[id] ?? fallback;

  // Rebuild the syntax palette from the shared allocation. `deriveHarmonyPalette`
  // still owns the hue geometry and the weight count; only the placement moves.
  // Single-ink themes take their role colours from the declared presentation
  // table rather than from the allocator's own bucketing. The allocator
  // optimises separation and has no view on which roles should share a tone;
  // with only two tones available that put keywords alone against eight roles
  // sharing one colour. The table splits them deliberately and lets weight and
  // slope carry the rest.
  const isSingleInk = harmony.mode === "monochromatic";
  const singleInkTones = isSingleInk
    ? [
        ...new Map(SYNTAX_ROLE_IDS.map(r => [toHex(budget.colors[r]), budget.colors[r]])).values(),
      ].sort((a, b) => a.l - b.l)
    : [];

  const inkFor = (role: LadderRole, fallback: OkLch): OkLch => {
    if (!isSingleInk || singleInkTones.length === 0) return budget.colors[role] ?? fallback;
    const { tone } = SINGLE_INK_PRESENTATION[role];
    // tone 0 is the brighter of the two; the sort above is ascending.
    const index = tone === 0 ? singleInkTones.length - 1 : 0;
    return singleInkTones[index];
  };

  const syntaxEmphasis: Partial<Record<string, "italic" | "bold" | "bold italic">> = {};
  if (isSingleInk) {
    for (const role of SYNTAX_ROLE_IDS) {
      const style = SINGLE_INK_PRESENTATION[role].fontStyle;
      if (style) syntaxEmphasis[role] = style;
    }
  }

  const budgetedHarmony: DerivedHarmonyPalette = {
    ...harmony,
    // Report what the allocation actually delivered, not what the ladder hoped
    // for. `deriveWeightGroups` computes a target from hue geometry alone; the
    // shared budget then places against the real background and the reserved
    // colours and can afford fewer. A single-ink theme labelled "4 weights"
    // while rendering three is a label that lies to the picker.
    weightCount: codeBudget.distinctCount,
    debug: {
      strings: inkFor("strings", harmony.debug.strings),
      numbers: inkFor("numbers", harmony.debug.numbers),
      keywords: inkFor("keywords", harmony.debug.keywords),
      functions: inkFor("functions", harmony.debug.functions),
      types: inkFor("types", harmony.debug.types),
      variables: inkFor("variables", harmony.debug.variables),
      constants: inkFor("constants", harmony.debug.constants),
      attributes: inkFor("attributes", harmony.debug.attributes),
      tags: inkFor("tags", harmony.debug.tags),
    },
    strings: toHex(inkFor("strings", harmony.debug.strings)),
    numbers: toHex(inkFor("numbers", harmony.debug.numbers)),
    keywords: toHex(inkFor("keywords", harmony.debug.keywords)),
    functions: toHex(inkFor("functions", harmony.debug.functions)),
    types: toHex(inkFor("types", harmony.debug.types)),
    variables: toHex(inkFor("variables", harmony.debug.variables)),
    constants: toHex(inkFor("constants", harmony.debug.constants)),
    attributes: toHex(inkFor("attributes", harmony.debug.attributes)),
    tags: toHex(inkFor("tags", harmony.debug.tags)),
  };

  const wheelFinal = {
    hueRed: budgeted("hueRed", hueRed),
    hueOrange: budgeted("hueOrange", hueOrange),
    hueYellow: budgeted("hueYellow", hueYellow),
    hueGreen: budgeted("hueGreen", hueGreen),
    hueCyan: budgeted("hueCyan", hueCyan),
    hueBlue: budgeted("hueBlue", hueBlue),
    huePurple: budgeted("huePurple", huePurple),
  };

  const accentSoftFinal = accentSoft;
  const accentMutedFinal = accentMuted;

  const intentEnabled = seed.intentMode ?? Boolean(seed.intentEmphasis);
  const intentEmphasis = seed.intentEmphasis ?? "balanced";
  const harmonyIntentOffsets = deriveHarmonyIntentOffsets(accent.h, harmonyMode);
  const intent = intentEnabled
    ? deriveIntentPaletteWithHarmony(accent.h, accent.c, intentEmphasis, harmonyIntentOffsets)
    : undefined;

  const borderOk = tintText(bg0.h, bg2.l + 0.02, bg0.c);
  const border = toHex(borderOk);

  const selectionAlpha = 0.28;
  const selectionBase = oklch(accent.l, Math.min(accent.c, 0.16), accent.h);
  const selection = withAlpha(toHex(selectionBase), selectionAlpha);

  return {
    seed,
    mode,
    debug: {
      oklch: {
        bg0,
        bg1,
        bg2,
        fg0,
        fg1,
        fgMuted,
        accent,
        accentSoft: accentSoftFinal,
        accentMuted: accentMutedFinal,
        accentSubtle,
        hueRed: wheelFinal.hueRed,
        hueOrange: wheelFinal.hueOrange,
        hueYellow: wheelFinal.hueYellow,
        hueGreen: wheelFinal.hueGreen,
        hueCyan: wheelFinal.hueCyan,
        hueBlue: wheelFinal.hueBlue,
        huePurple: wheelFinal.huePurple,
        border: borderOk,
        selectionBase,
      },
      selectionAlpha,
      harmonyMode,
      // Phase 4 debug info
      syntaxStyle,
      contrastTarget,
      chromaMultiplier: chromaMult,
      lightnessBoost: lBoost,
    },
    bg0: toHex(bg0),
    bg1: toHex(bg1),
    bg2: toHex(bg2),
    fg0: toHex(fg0),
    fg1: toHex(fg1),
    fgMuted: toHex(fgMuted),
    accent: toHex(accent),
    accentSoft: toHex(accentSoftFinal),
    accentMuted: toHex(accentMutedFinal),
    accentSubtle: toHex(accentSubtle),
    hueRed: toHex(wheelFinal.hueRed),
    ansi: deriveAnsiPalette(bg0),
    hueOrange: toHex(wheelFinal.hueOrange),
    hueYellow: toHex(wheelFinal.hueYellow),
    hueGreen: toHex(wheelFinal.hueGreen),
    hueCyan: toHex(wheelFinal.hueCyan),
    hueBlue: toHex(wheelFinal.hueBlue),
    huePurple: toHex(wheelFinal.huePurple),
    semantic,
    harmony: budgetedHarmony,
    brackets: Array.from({ length: 6 }, (_, i) => toHex(bracketBudget.colors[`bracket${i + 1}`])),
    syntaxEmphasis,
    intent,
    border,
    selection,
  };
}
