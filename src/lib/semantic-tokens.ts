import type { DerivedPalette } from "./palette.js";

/**
 * VS Code semantic token color mapping.
 * @see https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
 */
export type SemanticTokenColors = Record<
  string,
  string | { foreground?: string; fontStyle?: string }
>;

/**
 * Derives semantic token colors from a palette.
 * These provide richer syntax highlighting based on language server information,
 * going beyond TextMate scopes to understand the semantic meaning of symbols.
 *
 * @param p - The derived palette
 * @returns Semantic token color mappings for VS Code themes
 */
export function deriveSemanticTokenColors(p: DerivedPalette): SemanticTokenColors {
  return {
    // ═══════════════════════════════════════════════════════════════════════
    // TYPE-LIKE CONSTRUCTS (classes, interfaces, types, enums)
    // ═══════════════════════════════════════════════════════════════════════
    class: p.harmony.types,
    interface: p.harmony.types,
    type: p.harmony.types,
    enum: p.harmony.types,
    typeParameter: p.accentMuted,
    struct: p.harmony.types,
    "class.defaultLibrary": {
      foreground: p.harmony.types,
      fontStyle: "bold",
    },

    // ═══════════════════════════════════════════════════════════════════════
    // FUNCTION-LIKE CONSTRUCTS
    // ═══════════════════════════════════════════════════════════════════════
    function: p.harmony.functions,
    "function.declaration": p.harmony.functions,
    "function.async": p.harmony.functions,
    method: p.harmony.functions,
    "method.declaration": p.harmony.functions,
    "method.async": p.harmony.functions,
    "function.defaultLibrary": {
      foreground: p.harmony.functions,
      fontStyle: "bold",
    },

    // ═══════════════════════════════════════════════════════════════════════
    // VARIABLES AND PARAMETERS
    // ═══════════════════════════════════════════════════════════════════════
    variable: p.harmony.variables,
    parameter: p.harmony.variables,
    "variable.readonly": p.harmony.constants,
    "variable.defaultLibrary": {
      foreground: p.harmony.constants,
      fontStyle: "bold",
    },
    event: p.fgMuted,
    label: p.harmony.keywords,

    // ═══════════════════════════════════════════════════════════════════════
    // PROPERTIES AND MEMBERS
    // ═══════════════════════════════════════════════════════════════════════
    property: p.fg0,
    "property.readonly": p.harmony.constants,
    "property.declaration": p.fg0,
    enumMember: p.harmony.constants,

    // ═══════════════════════════════════════════════════════════════════════
    // DECORATORS AND ATTRIBUTES
    // ═══════════════════════════════════════════════════════════════════════
    decorator: p.harmony.attributes,
    macro: p.harmony.attributes,

    // ═══════════════════════════════════════════════════════════════════════
    // KEYWORDS AND OPERATORS
    // ═══════════════════════════════════════════════════════════════════════
    keyword: p.harmony.keywords,
    operator: p.fgMuted,

    // ═══════════════════════════════════════════════════════════════════════
    // NAMESPACES AND MODULES
    // ═══════════════════════════════════════════════════════════════════════
    namespace: p.harmony.types,
    module: p.harmony.types,

    // ═══════════════════════════════════════════════════════════════════════
    // STRINGS AND LITERALS
    // ═══════════════════════════════════════════════════════════════════════
    string: p.harmony.strings,
    number: p.harmony.numbers,
    regexp: p.harmony.strings, // Use strings color for regex (similar literal type)

    // ═══════════════════════════════════════════════════════════════════════
    // COMMENTS
    // ═══════════════════════════════════════════════════════════════════════
    comment: {
      foreground: p.fgMuted,
      fontStyle: "italic",
    },
    "comment.documentation": {
      foreground: p.harmony.attributes, // Use attributes for doc comments (similar to decorators)
      fontStyle: "italic",
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SPECIAL MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    "*.deprecated": {
      foreground: p.fgMuted,
      fontStyle: "italic strikethrough",
    },
    "*.declaration": {
      fontStyle: "bold",
    },
    "*.static": {
      fontStyle: "underline",
    },
    "*.abstract": {
      fontStyle: "italic",
    },
    "*.modification": {
      foreground: p.harmony.variables,
    },
    "*.documentation": {
      fontStyle: "italic",
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LANGUAGE-SPECIFIC OVERRIDES
    // ═══════════════════════════════════════════════════════════════════════

    // Python: Decorators and magic methods use attributes color
    "decorator:python": p.harmony.attributes,
    "method.magic:python": p.harmony.attributes,
    "parameter:python": {
      foreground: p.harmony.variables,
      fontStyle: "italic",
    },

    // Rust: Macros, attributes, and lifetimes
    "macro:rust": p.harmony.attributes,
    "attribute:rust": p.harmony.attributes,
    "lifetime:rust": p.harmony.attributes,

    // Java: Annotations treated as documentation hints
    "decorator:java": p.harmony.attributes,
    "decorator.override:java": {
      foreground: p.fgMuted,
      fontStyle: "italic",
    },

    // Go: Struct tags are metadata
    "string.structTag:go": p.harmony.attributes,

    // TypeScript/JavaScript: highlight language defaults and readonlys
    "variable:typescript": p.harmony.variables,
    "variable:javascript": p.harmony.variables,
    "variable.readonly:typescript": {
      foreground: p.harmony.constants,
      fontStyle: "bold",
    },
    "function.defaultLibrary:typescript": {
      foreground: p.harmony.functions,
      fontStyle: "bold",
    },
    "class.defaultLibrary:typescript": {
      foreground: p.harmony.types,
      fontStyle: "bold",
    },
    "variable.defaultLibrary:javascript": {
      foreground: p.harmony.constants,
      fontStyle: "bold",
    },
    "type:typescript": p.harmony.types,
    "enumMember:typescript": p.harmony.constants,

    // CSS/SCSS properties
    "property:css": p.harmony.attributes,
    "property:scss": p.harmony.attributes,

    // C#: Attributes and properties
    "attribute:csharp": p.harmony.attributes,
    "property.get:csharp": p.harmony.variables,
    "property.set:csharp": p.harmony.keywords,

    // C++: Template and concepts
    "keyword.template:cpp": p.harmony.types,
    "keyword.concept:cpp": p.harmony.attributes,

    // Kotlin: Delegation and coroutines
    "keyword.by:kotlin": p.harmony.attributes,
    "keyword.suspend:kotlin": p.harmony.keywords,

    // Lua: Metatables
    "function.metatable:lua": p.harmony.attributes,

    // Ruby: Symbols and metaprogramming
    "symbol:ruby": p.harmony.constants,
    "method.metaprogramming:ruby": p.harmony.attributes,

    // Shell: Pipes and redirects
    "operator.pipe:shellscript": p.harmony.keywords,
    "operator.redirect:shellscript": p.harmony.keywords,
  };
}
