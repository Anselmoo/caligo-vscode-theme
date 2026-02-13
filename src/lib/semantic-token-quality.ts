import { converter } from "culori";
import { APCAcontrast, sRGBtoY } from "./apca-wrapper.js";
import {
  STANDARD_SEMANTIC_TOKEN_MODIFIERS,
  STANDARD_SEMANTIC_TOKEN_TYPES,
} from "./semantic-token-registry.js";
import type { SemanticTokenColors } from "./semantic-tokens.js";

type SemanticColorValue = string | { foreground?: string; fontStyle?: string };

type TierName = "tier1" | "tier2" | "tier3" | "tier4" | "tier5";

const APCA_MIN_LC: Record<TierName, number> = {
  tier1: 42,
  tier2: 39,
  tier3: 38,
  tier4: 35,
  tier5: 30,
};

const APCA_TIER_TOKENS: Record<TierName, string[]> = {
  tier1: ["variable", "parameter", "function", "method", "property"],
  tier2: ["class", "type", "interface", "keyword", "string", "number", "enum"],
  tier3: [
    "decorator",
    "macro",
    "label",
    "event",
    "operator",
    "enumMember",
    "namespace",
    "struct",
    "regexp",
    "typeParameter",
  ],
  tier4: ["comment", "comment.documentation"],
  tier5: ["*.deprecated"],
};

const CRITICAL_DELTA_E = 0.02;
const IMPORTANT_DELTA_E = 0.01;
const MODIFIER_DELTA_E = 0.0;

const CRITICAL_PAIRS: Array<[string, string]> = [
  ["variable", "keyword"],
  ["property", "keyword"],
];

const IMPORTANT_PAIRS: Array<[string, string]> = [
  ["variable", "function"],
  ["enum", "enumMember"],
  ["type", "keyword"],
];

const MODIFIER_PAIRS: Array<[string, string]> = [];

const toOklch = converter("oklch");
const hasOwnProp = Object.prototype.hasOwnProperty;

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
  if (
    !c1 ||
    !c2 ||
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

function hasAnyModifierCoverage(tokens: SemanticTokenColors, modifier: string): boolean {
  return (
    hasOwnProp.call(tokens, `*.${modifier}`) ||
    Object.keys(tokens).some(key => key.includes(`.${modifier}`))
  );
}

function hasTypeCoverage(tokens: SemanticTokenColors, typeName: string): boolean {
  return (
    hasOwnProp.call(tokens, typeName) ||
    Object.keys(tokens).some(
      key => key.startsWith(`${typeName}.`) || key.startsWith(`${typeName}:`)
    )
  );
}

export type SemanticTokenQualityReport = {
  coverage: {
    typeCoverage: number;
    modifierCoverage: number;
    missingTypes: string[];
    missingModifiers: string[];
    valid: boolean;
  };
  apca: {
    valid: boolean;
    minLcByTier: Record<TierName, number>;
    violations: string[];
  };
  deltaE: {
    valid: boolean;
    minima: {
      critical: number;
      important: number;
      modifier: number;
    };
    violations: string[];
  };
};

export function evaluateSemanticTokenQuality(
  tokens: SemanticTokenColors,
  editorBackground: string
): SemanticTokenQualityReport {
  const missingTypes = STANDARD_SEMANTIC_TOKEN_TYPES.filter(
    typeName => !hasTypeCoverage(tokens, typeName)
  );
  const missingModifiers = STANDARD_SEMANTIC_TOKEN_MODIFIERS.filter(
    modifier => !hasAnyModifierCoverage(tokens, modifier)
  );

  const typeCoverage =
    (STANDARD_SEMANTIC_TOKEN_TYPES.length - missingTypes.length) /
    STANDARD_SEMANTIC_TOKEN_TYPES.length;
  const modifierCoverage =
    (STANDARD_SEMANTIC_TOKEN_MODIFIERS.length - missingModifiers.length) /
    STANDARD_SEMANTIC_TOKEN_MODIFIERS.length;

  const minLcByTier: Record<TierName, number> = {
    tier1: Number.POSITIVE_INFINITY,
    tier2: Number.POSITIVE_INFINITY,
    tier3: Number.POSITIVE_INFINITY,
    tier4: Number.POSITIVE_INFINITY,
    tier5: Number.POSITIVE_INFINITY,
  };
  const apcaViolations: string[] = [];

  for (const [tier, selectors] of Object.entries(APCA_TIER_TOKENS) as Array<[TierName, string[]]>) {
    for (const selector of selectors) {
      const foreground = extractForeground(tokens[selector]);
      if (!foreground) continue;
      const lc = apcaLc(foreground, editorBackground);
      minLcByTier[tier] = Math.min(minLcByTier[tier], lc);
      if (lc < APCA_MIN_LC[tier]) {
        apcaViolations.push(`${selector}: Lc=${lc.toFixed(2)} < ${APCA_MIN_LC[tier]}`);
      }
    }
    if (!Number.isFinite(minLcByTier[tier])) {
      minLcByTier[tier] = 0;
    }
  }

  const deltaViolations: string[] = [];
  const checkPairs = (
    pairs: Array<[string, string]>,
    min: number,
    label: "critical" | "important" | "modifier"
  ) => {
    for (const [a, b] of pairs) {
      const ca = extractForeground(tokens[a]);
      const cb = extractForeground(tokens[b]);
      if (!ca || !cb) continue;
      const d = deltaEOklch(ca, cb);
      if (d < min) {
        deltaViolations.push(`${label}: ${a} ↔ ${b}: ΔE=${d.toFixed(4)} < ${min}`);
      }
    }
  };

  checkPairs(CRITICAL_PAIRS, CRITICAL_DELTA_E, "critical");
  checkPairs(IMPORTANT_PAIRS, IMPORTANT_DELTA_E, "important");
  checkPairs(MODIFIER_PAIRS, MODIFIER_DELTA_E, "modifier");

  return {
    coverage: {
      typeCoverage,
      modifierCoverage,
      missingTypes,
      missingModifiers,
      valid: typeCoverage >= 0.95 && modifierCoverage >= 0.8,
    },
    apca: {
      valid: apcaViolations.length === 0,
      minLcByTier,
      violations: apcaViolations,
    },
    deltaE: {
      valid: deltaViolations.length === 0,
      minima: {
        critical: CRITICAL_DELTA_E,
        important: IMPORTANT_DELTA_E,
        modifier: MODIFIER_DELTA_E,
      },
      violations: deltaViolations,
    },
  };
}
