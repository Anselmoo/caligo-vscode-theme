/**
 * Language-Specific Intent Mapping Types
 *
 * Defines interfaces for mapping language-specific semantic tokens
 * to universal intent layers.
 */

import type { IntentLayer } from "../intent-layers.js";

/**
 * Supported languages for language-specific mappings.
 */
export const SUPPORTED_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "ruby",
  "java",
  "kotlin",
  "shellscript",
  "lua",
  "go",
  "rust",
  "cpp",
  "csharp",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Language-specific intent mapping rule.
 */
export interface LanguageIntentRule {
  /** Intent layer this token maps to */
  layer: IntentLayer;
  /** Optional modifiers specific to this language pattern */
  modifiers?: string[];
  /** Human-readable description of this mapping */
  description: string;
  /** Examples of code that triggers this rule */
  examples?: string[];
}

/**
 * Collection of language-specific intent mappings.
 * Keys are semantic token patterns (e.g., "decorator", "function.async").
 */
export type LanguageIntentMapping = Record<string, LanguageIntentRule>;

/**
 * Language mapper configuration.
 */
export interface LanguageMapper {
  /** Language identifier */
  language: SupportedLanguage;
  /** Display name for UI */
  displayName: string;
  /** Language-specific intent mappings */
  mappings: LanguageIntentMapping;
  /** File extensions for this language */
  extensions: string[];
}
