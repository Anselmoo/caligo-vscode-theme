import { converter } from "culori";
import { APCAcontrast, sRGBtoY } from "./apca-wrapper.js";
import type { DerivedPalette } from "./palette.js";
import type { SemanticTokenColors } from "./semantic-tokens.js";

type SemanticColorValue = string | { foreground?: string; fontStyle?: string };

export type ThemeHarmonyId =
  | "balanced"
  | "analogous"
  | "monochromatic"
  | "split-complementary"
  | "triadic";

export type ModeDistinctnessSample = {
  seedId: string;
  themeId: string;
  harmonyId: ThemeHarmonyId;
  editorBg: string;
  uiRamp: {
    accent: string;
    accentSoft: string;
    accentMuted: string;
    accentSubtle: string;
  };
  tier1: {
    variable: string;
    parameter: string;
    property: string;
    function: string;
    method: string;
  };
};

export type ModeDistinctnessPair = {
  seedId: string;
  from: ThemeHarmonyId;
  to: ThemeHarmonyId;
  minUiDeltaE: number;
  minTier1DeltaE: number;
  minUiApcaLc: number;
  minTier1ApcaLc: number;
  score: number;
  valid: boolean;
  violations: string[];
};

export type ModeDistinctnessReport = {
  valid: boolean;
  thresholds: {
    minUiDeltaE: number;
    minTier1DeltaE: number;
    minUiApcaLc: number;
    minTier1ApcaLc: number;
  };
  seedScores: Array<{
    seedId: string;
    score: number;
    minPairScore: number;
    pairCount: number;
    valid: boolean;
  }>;
  pairChecks: ModeDistinctnessPair[];
  violations: string[];
};

export const MODE_DISTINCTNESS_THRESHOLDS = {
  minUiDeltaE: 0.0025,
  minTier1DeltaE: 0.0065,
  minUiApcaLc: 20,
  minTier1ApcaLc: 38,
} as const;

const toOklch = converter("oklch");
const HARMONY_ORDER: ThemeHarmonyId[] = [
  "balanced",
  "analogous",
  "monochromatic",
  "split-complementary",
  "triadic",
];

type OklchLike = {
  l: number;
  c: number;
  h?: number;
};

function normalizeHex(hex: string): string {
  const v = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{8}$/.test(v)) {
    return v.slice(0, 7);
  }
  return v;
}

function isHexColor(v: string): boolean {
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(v.trim().toLowerCase());
}

function extractForeground(value: SemanticColorValue | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return isHexColor(value) ? normalizeHex(value) : undefined;
  }
  if (typeof value.foreground === "string" && isHexColor(value.foreground)) {
    return normalizeHex(value.foreground);
  }
  return undefined;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = normalizeHex(hex).replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function apcaLc(foregroundHex: string, backgroundHex: string): number {
  const fgY = sRGBtoY(hexToRgb(foregroundHex));
  const bgY = sRGBtoY(hexToRgb(backgroundHex));
  return Math.abs(APCAcontrast(fgY, bgY));
}

function deltaEOklch(hex1: string, hex2: string): number {
  const c1 = toOklch(hex1) as OklchLike | undefined;
  const c2 = toOklch(hex2) as OklchLike | undefined;

  if (!c1 || !c2) return 0;
  if (
    !Number.isFinite(c1.l) ||
    !Number.isFinite(c1.c) ||
    !Number.isFinite(c2.l) ||
    !Number.isFinite(c2.c) ||
    c1.h === undefined ||
    c2.h === undefined
  ) {
    return 0;
  }

  const dl = c1.l - c2.l;
  const dc = c1.c - c2.c;
  const h1Rad = (c1.h * Math.PI) / 180;
  const h2Rad = (c2.h * Math.PI) / 180;
  const dh = 2 * Math.sqrt(c1.c * c2.c) * Math.sin((h1Rad - h2Rad) / 2);
  return Math.sqrt(dl * dl + dc * dc + dh * dh);
}

function scoreRatio(value: number, min: number): number {
  if (min <= 0) return 1;
  return Math.max(0, Math.min(1, value / min));
}

function compareColorSets(
  a: Record<string, string>,
  b: Record<string, string>
): { minDeltaE: number } {
  const keys = Object.keys(a).filter(key => typeof b[key] === "string");
  if (keys.length === 0) {
    return { minDeltaE: 0 };
  }

  let minDeltaE = Number.POSITIVE_INFINITY;

  for (const key of keys) {
    const d = deltaEOklch(a[key], b[key]);
    minDeltaE = Math.min(minDeltaE, d);
  }

  return { minDeltaE: Number.isFinite(minDeltaE) ? minDeltaE : 0 };
}

function minApcaLcSet(values: Record<string, string>, bg: string): number {
  const keys = Object.keys(values);
  if (keys.length === 0) return 0;

  let minApca = Number.POSITIVE_INFINITY;
  for (const key of keys) {
    const lc = apcaLc(values[key], bg);
    minApca = Math.min(minApca, lc);
  }

  return Number.isFinite(minApca) ? minApca : 0;
}

function compareApcaSets(
  a: Record<string, string>,
  b: Record<string, string>,
  bgA: string,
  bgB: string
): { minApcaLc: number } {
  const minA = minApcaLcSet(a, bgA);
  const minB = minApcaLcSet(b, bgB);
  return { minApcaLc: Math.min(minA, minB) };
}

export function harmonyModeToId(mode?: string): ThemeHarmonyId {
  switch (mode) {
    case "analogous":
    case "monochromatic":
    case "triadic":
    case "split-complementary":
      return mode;
    default:
      return "balanced";
  }
}

export function buildModeDistinctnessSample(
  seedId: string,
  harmonyId: ThemeHarmonyId,
  palette: DerivedPalette,
  semanticTokenColors: SemanticTokenColors
): ModeDistinctnessSample {
  const tier1Fallback = {
    variable: palette.harmony.variables,
    parameter: palette.harmony.variables,
    property: palette.fg0,
    function: palette.harmony.functions,
    method: palette.harmony.functions,
  };

  return {
    seedId,
    themeId: palette.seed.id,
    harmonyId,
    editorBg: palette.bg0,
    uiRamp: {
      accent: palette.accent,
      accentSoft: palette.accentSoft,
      accentMuted: palette.accentMuted,
      accentSubtle: palette.accentSubtle,
    },
    tier1: {
      variable: extractForeground(semanticTokenColors.variable) ?? tier1Fallback.variable,
      parameter: extractForeground(semanticTokenColors.parameter) ?? tier1Fallback.parameter,
      property: extractForeground(semanticTokenColors.property) ?? tier1Fallback.property,
      function: extractForeground(semanticTokenColors.function) ?? tier1Fallback.function,
      method: extractForeground(semanticTokenColors.method) ?? tier1Fallback.method,
    },
  };
}

export function evaluateModeDistinctness(
  samples: ModeDistinctnessSample[]
): ModeDistinctnessReport {
  const grouped = new Map<string, ModeDistinctnessSample[]>();
  for (const sample of samples) {
    const list = grouped.get(sample.seedId) ?? [];
    list.push(sample);
    grouped.set(sample.seedId, list);
  }

  const pairChecks: ModeDistinctnessPair[] = [];
  const violations: string[] = [];
  const seedScores: ModeDistinctnessReport["seedScores"] = [];

  for (const [seedId, entries] of grouped) {
    const byHarmony = new Map<ThemeHarmonyId, ModeDistinctnessSample>();
    for (const entry of entries) {
      byHarmony.set(entry.harmonyId, entry);
    }

    const ordered = HARMONY_ORDER.map(id => byHarmony.get(id)).filter(
      (x): x is ModeDistinctnessSample => Boolean(x)
    );

    const seedPairScores: number[] = [];
    for (let i = 0; i < ordered.length; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const a = ordered[i];
        const b = ordered[j];

        const ui = compareColorSets(a.uiRamp, b.uiRamp);
        const tier1 = compareColorSets(a.tier1, b.tier1);
        const apcaUi = compareApcaSets(
          {
            accent: a.uiRamp.accent,
            accentSoft: a.uiRamp.accentSoft,
            accentMuted: a.uiRamp.accentMuted,
          },
          {
            accent: b.uiRamp.accent,
            accentSoft: b.uiRamp.accentSoft,
            accentMuted: b.uiRamp.accentMuted,
          },
          a.editorBg,
          b.editorBg
        );
        const apcaTier1 = compareApcaSets(a.tier1, b.tier1, a.editorBg, b.editorBg);

        const score =
          (scoreRatio(ui.minDeltaE, MODE_DISTINCTNESS_THRESHOLDS.minUiDeltaE) +
            scoreRatio(tier1.minDeltaE, MODE_DISTINCTNESS_THRESHOLDS.minTier1DeltaE) +
            scoreRatio(apcaUi.minApcaLc, MODE_DISTINCTNESS_THRESHOLDS.minUiApcaLc) +
            scoreRatio(apcaTier1.minApcaLc, MODE_DISTINCTNESS_THRESHOLDS.minTier1ApcaLc)) /
          4;

        const pairViolations: string[] = [];
        if (ui.minDeltaE < MODE_DISTINCTNESS_THRESHOLDS.minUiDeltaE) {
          pairViolations.push(
            `ui ΔE ${ui.minDeltaE.toFixed(4)} < ${MODE_DISTINCTNESS_THRESHOLDS.minUiDeltaE}`
          );
        }
        if (tier1.minDeltaE < MODE_DISTINCTNESS_THRESHOLDS.minTier1DeltaE) {
          pairViolations.push(
            `tier1 ΔE ${tier1.minDeltaE.toFixed(4)} < ${MODE_DISTINCTNESS_THRESHOLDS.minTier1DeltaE}`
          );
        }
        if (apcaUi.minApcaLc < MODE_DISTINCTNESS_THRESHOLDS.minUiApcaLc) {
          pairViolations.push(
            `ui APCA Lc ${apcaUi.minApcaLc.toFixed(2)} < ${MODE_DISTINCTNESS_THRESHOLDS.minUiApcaLc}`
          );
        }
        if (apcaTier1.minApcaLc < MODE_DISTINCTNESS_THRESHOLDS.minTier1ApcaLc) {
          pairViolations.push(
            `tier1 APCA Lc ${apcaTier1.minApcaLc.toFixed(2)} < ${MODE_DISTINCTNESS_THRESHOLDS.minTier1ApcaLc}`
          );
        }

        const pairCheck: ModeDistinctnessPair = {
          seedId,
          from: a.harmonyId,
          to: b.harmonyId,
          minUiDeltaE: ui.minDeltaE,
          minTier1DeltaE: tier1.minDeltaE,
          minUiApcaLc: apcaUi.minApcaLc,
          minTier1ApcaLc: apcaTier1.minApcaLc,
          score,
          valid: pairViolations.length === 0,
          violations: pairViolations,
        };
        pairChecks.push(pairCheck);
        seedPairScores.push(score);

        if (pairViolations.length > 0) {
          violations.push(`${seedId} ${a.harmonyId}↔${b.harmonyId}: ${pairViolations.join(", ")}`);
        }
      }
    }

    const minPairScore = seedPairScores.length > 0 ? Math.min(...seedPairScores) : 0;
    const score =
      seedPairScores.length > 0
        ? seedPairScores.reduce((sum, value) => sum + value, 0) / seedPairScores.length
        : 0;
    const valid = pairChecks.filter(p => p.seedId === seedId).every(p => p.valid);

    seedScores.push({
      seedId,
      score,
      minPairScore,
      pairCount: seedPairScores.length,
      valid,
    });
  }

  return {
    valid: violations.length === 0,
    thresholds: { ...MODE_DISTINCTNESS_THRESHOLDS },
    seedScores,
    pairChecks,
    violations,
  };
}
