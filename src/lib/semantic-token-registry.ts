/**
 * Canonical VS Code semantic token registry.
 * @see https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
 */
export const STANDARD_SEMANTIC_TOKEN_TYPES = [
  "namespace",
  "class",
  "enum",
  "interface",
  "struct",
  "typeParameter",
  "type",
  "parameter",
  "variable",
  "property",
  "enumMember",
  "event",
  "function",
  "method",
  "macro",
  "keyword",
  "modifier",
  "comment",
  "string",
  "number",
  "regexp",
  "operator",
  "decorator",
] as const;

export const STANDARD_SEMANTIC_TOKEN_MODIFIERS = [
  "declaration",
  "definition",
  "readonly",
  "static",
  "deprecated",
  "abstract",
  "async",
  "modification",
  "documentation",
  "defaultLibrary",
] as const;

export type StandardSemanticTokenType = (typeof STANDARD_SEMANTIC_TOKEN_TYPES)[number];
export type StandardSemanticTokenModifier = (typeof STANDARD_SEMANTIC_TOKEN_MODIFIERS)[number];
