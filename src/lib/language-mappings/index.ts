/**
 * Language-Aware Intent Resolver
 *
 * Resolves semantic tokens to intent layers with language-specific intelligence.
 */

import type { IntentLayer } from "../intent-layers.js";
import { cppMapper } from "./cpp.js";
import { csharpMapper } from "./csharp.js";
import { goMapper } from "./go.js";
import { javaMapper } from "./java.js";
import { kotlinMapper } from "./kotlin.js";
import { luaMapper } from "./lua.js";
import { pythonMapper } from "./python.js";
import { rubyMapper } from "./ruby.js";
import { rustMapper } from "./rust.js";
import { shellMapper } from "./shell.js";
import type { SupportedLanguage } from "./types.js";

/**
 * Registry of all language mappers.
 */
const LANGUAGE_MAPPERS = {
  python: pythonMapper,
  ruby: rubyMapper,
  java: javaMapper,
  shellscript: shellMapper,
  kotlin: kotlinMapper,
  go: goMapper,
  rust: rustMapper,
  lua: luaMapper,
  cpp: cppMapper,
  csharp: csharpMapper,
  // Add more languages as they're implemented
} as const;

/**
 * Default fallback mapping from semantic token to intent layer.
 * Used when no language-specific mapping exists.
 */
const DEFAULT_INTENT_MAPPING: Record<string, IntentLayer> = {
  // DECLARATION LAYER
  "class.declaration": "declaration",
  "function.declaration": "declaration",
  "method.declaration": "declaration",
  "variable.declaration": "declaration",
  "property.declaration": "declaration",
  "parameter.declaration": "declaration",
  "interface.declaration": "declaration",
  "type.declaration": "declaration",
  "enum.declaration": "declaration",
  class: "declaration",
  interface: "declaration",
  type: "declaration",
  enum: "declaration",
  struct: "declaration",
  function: "declaration",

  // MUTATION LAYER
  "variable.modification": "mutation",
  "property.modification": "mutation",
  operator: "mutation",

  // USAGE LAYER
  variable: "usage",
  parameter: "usage",
  property: "usage",
  "variable.readonly": "usage",
  "property.readonly": "usage",
  enumMember: "usage",
  member: "usage",
  method: "usage",

  // CONTROL FLOW LAYER
  keyword: "controlFlow",
  "keyword.control": "controlFlow",
  "keyword.operator": "controlFlow",

  // DATA LAYER
  string: "data",
  number: "data",
  regexp: "data",
  "variable.constant": "data",
  constant: "data",

  // META LAYER
  decorator: "meta",
  macro: "meta",

  // DOCUMENTATION LAYER
  comment: "documentation",
  "comment.documentation": "documentation",

  // SPECIAL CASES
  namespace: "declaration",
  module: "declaration",
  typeParameter: "declaration",
};

/**
 * Build token key from type and modifiers.
 */
function buildTokenKey(tokenType: string, modifiers: string[] = []): string {
  if (modifiers.length === 0) {
    return tokenType;
  }
  return `${tokenType}.${modifiers.join(".")}`;
}

/**
 * Resolve a semantic token to an intent layer with language awareness.
 *
 * @param tokenType - Semantic token type (e.g., "function", "variable")
 * @param modifiers - Semantic token modifiers (e.g., ["declaration", "async"])
 * @param language - Language identifier (e.g., "python", "java")
 * @returns The intent layer this token maps to
 */
export function resolveIntent(
  tokenType: string,
  modifiers: string[] = [],
  language?: SupportedLanguage
): IntentLayer {
  // Try language-specific mapping first
  if (language && language in LANGUAGE_MAPPERS) {
    const mapper = LANGUAGE_MAPPERS[language as keyof typeof LANGUAGE_MAPPERS];
    const tokenKey = buildTokenKey(tokenType, modifiers);

    // Try exact match with modifiers
    if (tokenKey in mapper.mappings) {
      return mapper.mappings[tokenKey].layer;
    }

    // Try without modifiers
    if (tokenType in mapper.mappings) {
      return mapper.mappings[tokenType].layer;
    }
  }

  // Fall back to default mapping
  const tokenKey = buildTokenKey(tokenType, modifiers);

  // Try exact match
  if (tokenKey in DEFAULT_INTENT_MAPPING) {
    return DEFAULT_INTENT_MAPPING[tokenKey];
  }

  // Try without modifiers
  if (tokenType in DEFAULT_INTENT_MAPPING) {
    return DEFAULT_INTENT_MAPPING[tokenType];
  }

  // Ultimate fallback: usage layer
  return "usage";
}

/**
 * Get all available language mappers.
 */
export function getAvailableLanguages(): SupportedLanguage[] {
  return Object.keys(LANGUAGE_MAPPERS) as SupportedLanguage[];
}

/**
 * Get display name for a language.
 */
export function getLanguageDisplayName(language: SupportedLanguage): string {
  const mapper = LANGUAGE_MAPPERS[language as keyof typeof LANGUAGE_MAPPERS];
  return mapper?.displayName ?? language;
}

/**
 * Get a language mapper by language identifier.
 */
export function getLanguageMapper(language: SupportedLanguage) {
  return LANGUAGE_MAPPERS[language as keyof typeof LANGUAGE_MAPPERS];
}
