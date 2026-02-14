import { apcaLc, deltaEOklch, extractForeground } from "./color-utils.js";
import {
  STANDARD_SEMANTIC_TOKEN_MODIFIERS,
  STANDARD_SEMANTIC_TOKEN_TYPES,
} from "./semantic-token-registry.js";
import type { SemanticTokenColors } from "./semantic-tokens.js";

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

const hasOwnProp = Object.prototype.hasOwnProperty;

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
