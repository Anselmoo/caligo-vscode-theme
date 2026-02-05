/**
 * Python Language Intent Mappings
 *
 * Maps Python-specific semantic tokens to intent layers.
 * Handles Python idioms like decorators, async/await, comprehensions, etc.
 */

import type { LanguageMapper } from "./types.js";

export const pythonMapper: LanguageMapper = {
  language: "python",
  displayName: "Python",
  extensions: [".py", ".pyw", ".pyi"],

  mappings: {
    // DECORATORS → META LAYER
    decorator: {
      layer: "meta",
      description: "Python decorators (@decorator)",
      examples: ["@dataclass", "@property", "@staticmethod"],
    },

    // ASYNC/AWAIT → CONTROL FLOW
    "function.async": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Async function definitions",
      examples: ["async def fetch_data():"],
    },

    "keyword.async": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Async/await keywords",
      examples: ["await fetch_data()", "async with ..."],
    },

    // CONTEXT MANAGERS → CONTROL FLOW
    "keyword.with": {
      layer: "controlFlow",
      description: "Context manager (with statement)",
      examples: ["with open('file.txt') as f:"],
    },

    // COMPREHENSIONS → DATA
    "variable.comprehension": {
      layer: "data",
      modifiers: ["comprehension"],
      description: "List/dict/set comprehensions",
      examples: ["[x for x in range(10)]"],
    },

    // DUNDER METHODS → META
    "method.magic": {
      layer: "meta",
      description: "Magic/dunder methods",
      examples: ["__init__", "__str__", "__enter__"],
    },

    // PROPERTY DECORATORS → META
    "property.decorator": {
      layer: "meta",
      description: "Property decorators",
      examples: ["@property", "@x.setter"],
    },

    // LAMBDA → CONTROL FLOW
    "keyword.lambda": {
      layer: "controlFlow",
      description: "Lambda expressions",
      examples: ["lambda x: x * 2"],
    },

    // TYPE HINTS → DECLARATION (types are declarations)
    "type.hint": {
      layer: "declaration",
      description: "Type annotations",
      examples: ["def func(x: int) -> str:"],
    },

    // IMPORTS → DECLARATION
    "keyword.import": {
      layer: "declaration",
      description: "Import statements",
      examples: ["import os", "from typing import List"],
    },

    // SELF → USAGE (special variable)
    "variable.self": {
      layer: "usage",
      modifiers: ["builtin"],
      description: "Self parameter",
      examples: ["self.value", "self.method()"],
    },

    // CLASS DECORATORS → META
    "class.decorator": {
      layer: "meta",
      description: "Class decorators",
      examples: ["@dataclass", "@final"],
    },

    // YIELD → CONTROL FLOW
    "keyword.yield": {
      layer: "controlFlow",
      description: "Generator yield",
      examples: ["yield value", "yield from generator"],
    },

    // GLOBAL/NONLOCAL → MUTATION
    "keyword.scope": {
      layer: "mutation",
      description: "Scope modifiers (global/nonlocal)",
      examples: ["global counter", "nonlocal state"],
    },

    // WALRUS OPERATOR → MUTATION
    "operator.walrus": {
      layer: "mutation",
      description: "Walrus operator (:=)",
      examples: ["if (n := len(data)) > 10:"],
    },

    // MATCH/CASE (Python 3.10+) → CONTROL FLOW
    "keyword.match": {
      layer: "controlFlow",
      description: "Pattern matching",
      examples: ["match value:", "case pattern:"],
    },
  },
};
