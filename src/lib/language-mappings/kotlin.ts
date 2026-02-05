import type { LanguageMapper } from "./types.js";

/**
 * Kotlin-specific semantic token to intent layer mappings.
 *
 * Focus areas:
 * - Coroutines (suspend, async, launch, flow)
 * - Delegation (by lazy, by remember)
 * - Extension functions
 * - Data classes
 * - Sealed classes/interfaces
 * - Nullable types
 */
export const kotlinMapper: LanguageMapper = {
  language: "kotlin",
  displayName: "Kotlin",
  extensions: [".kt", ".kts"],
  mappings: {
    // Coroutines → Control Flow
    "keyword.suspend": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Suspend functions (coroutines)",
      examples: ["suspend fun fetch()"],
    },
    "function.coroutine": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Coroutine builders (launch, async)",
      examples: ["launch { }", "async { }"],
    },
    "keyword.flow": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Kotlin Flow streams",
      examples: ["flow { emit(1) }"],
    },

    // Delegation → Meta
    "keyword.by": {
      layer: "meta",
      description: "Delegation keyword",
      examples: ["by lazy { }", "by remember { }"],
    },
    "property.delegated": {
      layer: "meta",
      description: "Delegated properties",
      examples: ["val name by lazy { }"],
    },

    // Extension functions → Declaration
    "function.extension": {
      layer: "declaration",
      modifiers: ["extension"],
      description: "Extension functions",
      examples: ["fun String.toTitleCase()"],
    },

    // Data classes → Declaration
    "keyword.data": {
      layer: "declaration",
      description: "Data class modifier",
      examples: ["data class User"],
    },

    // Sealed classes/interfaces → Meta
    "keyword.sealed": {
      layer: "meta",
      description: "Sealed classes/interfaces for restricted hierarchies",
      examples: ["sealed class Result"],
    },

    // Annotations → Meta
    decorator: {
      layer: "meta",
      description: "Kotlin annotations",
      examples: ["@Composable", "@Serializable"],
    },

    // Nullable types → Usage with special modifier
    "type.nullable": {
      layer: "usage",
      modifiers: ["nullable"],
      description: "Nullable type syntax",
      examples: ["String?", "Int?"],
    },
    "operator.safe": {
      layer: "usage",
      description: "Safe call/elvis operators",
      examples: ["?.let", "?:"],
    },

    // Companion objects → Meta
    "keyword.companion": {
      layer: "meta",
      description: "Companion objects",
      examples: ["companion object { }"],
    },

    // Inline/reified → Meta
    "keyword.inline": {
      layer: "meta",
      description: "Inline functions",
      examples: ["inline fun <reified T>"],
    },
    "keyword.reified": {
      layer: "meta",
      description: "Reified type parameters",
      examples: ["reified T"],
    },

    // Object declarations → Declaration
    "keyword.object": {
      layer: "declaration",
      description: "Object declarations (singletons)",
      examples: ["object Utils { }"],
    },

    // When expressions → Control Flow
    "keyword.when": {
      layer: "controlFlow",
      description: "When expressions (pattern matching)",
      examples: ["when (x) { is String -> }"],
    },

    // Smart casts → Control Flow
    "keyword.is": {
      layer: "controlFlow",
      description: "Type checking and smart casts",
      examples: ["if (x is String)"],
    },

    // Destructuring → Declaration
    "variable.destructured": {
      layer: "declaration",
      description: "Destructuring declarations",
      examples: ["val (name, age) = person"],
    },

    // Lambda parameters → Declaration
    "parameter.lambda": {
      layer: "declaration",
      modifiers: ["lambda"],
      description: "Lambda parameters",
      examples: ["{ name -> }"],
    },

    // Backing fields → Mutation
    "keyword.field": {
      layer: "mutation",
      description: "Backing field reference",
      examples: ["field = value"],
    },

    // Operator overloading → Declaration
    "keyword.operator": {
      layer: "declaration",
      description: "Operator overloading",
      examples: ["operator fun plus()"],
    },

    // Import aliases → Meta
    "keyword.as": {
      layer: "meta",
      description: "Import aliases and type casting",
      examples: ["import X as Y", "x as String"],
    },
  },
};
