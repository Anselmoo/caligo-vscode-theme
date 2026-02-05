/**
 * Ruby Language Intent Mappings
 *
 * Maps Ruby-specific semantic tokens to intent layers.
 * Handles Ruby idioms like blocks, symbols, metaprogramming, etc.
 */

import type { LanguageMapper } from "./types.js";

export const rubyMapper: LanguageMapper = {
  language: "ruby",
  displayName: "Ruby",
  extensions: [".rb", ".rake", ".gemspec", ".ru"],

  mappings: {
    // BLOCKS → DECLARATION/CONTROL FLOW
    "method.block": {
      layer: "declaration",
      modifiers: ["block"],
      description: "Methods accepting blocks",
      examples: ["def process(&block)", "def map(&:to_s)"],
    },

    "parameter.block": {
      layer: "controlFlow",
      modifiers: ["block"],
      description: "Block parameters",
      examples: ["|x, y|", "|item|"],
    },

    // YIELD → CONTROL FLOW
    "keyword.yield": {
      layer: "controlFlow",
      description: "Yield to block",
      examples: ["yield item", "yield(x, y)"],
    },

    // SYMBOLS → DATA
    symbol: {
      layer: "data",
      description: "Ruby symbols",
      examples: [":name", ":to_s", ":each"],
    },

    // PROC/LAMBDA → CONTROL FLOW
    "keyword.proc": {
      layer: "controlFlow",
      description: "Proc and lambda literals",
      examples: ["proc { |x| x * 2 }", "lambda { |x| x + 1 }"],
    },

    // ATTR_ACCESSOR → META
    "method.metaprogramming": {
      layer: "meta",
      description: "Metaprogramming methods",
      examples: ["attr_accessor", "attr_reader", "define_method"],
    },

    // CLASS/MODULE KEYWORDS → DECLARATION
    "keyword.class": {
      layer: "declaration",
      description: "Class/module definitions",
      examples: ["class User", "module Helpers"],
    },

    // SELF → USAGE
    "variable.self": {
      layer: "usage",
      modifiers: ["builtin"],
      description: "Self reference",
      examples: ["self.class", "self.method"],
    },

    // INSTANCE VARIABLES → USAGE/MUTATION
    "variable.instance": {
      layer: "usage",
      description: "Instance variables",
      examples: ["@name", "@user"],
    },

    "variable.instance.modification": {
      layer: "mutation",
      description: "Instance variable assignment",
      examples: ["@name = value"],
    },

    // CLASS VARIABLES → USAGE/MUTATION
    "variable.class": {
      layer: "usage",
      description: "Class variables",
      examples: ["@@count", "@@cache"],
    },

    // GLOBAL VARIABLES → USAGE/MUTATION
    "variable.global": {
      layer: "usage",
      description: "Global variables",
      examples: ["$stdin", "$LOAD_PATH"],
    },

    // STRING INTERPOLATION → DATA
    "string.interpolation": {
      layer: "data",
      description: "String interpolation",
      examples: ['"Hello #{name}"'],
    },

    // REGEX → DATA
    regexp: {
      layer: "data",
      description: "Regular expressions",
      examples: ["/[a-z]+/", "%r{pattern}"],
    },

    // HEREDOC → DATA
    "string.heredoc": {
      layer: "data",
      description: "Heredoc strings",
      examples: ["<<~SQL", "<<-HTML"],
    },

    // METHOD MISSING → META
    "method.method_missing": {
      layer: "meta",
      description: "Dynamic method dispatch",
      examples: ["method_missing", "respond_to_missing?"],
    },

    // ALIAS → META
    "keyword.alias": {
      layer: "meta",
      description: "Method aliasing",
      examples: ["alias new_name old_name"],
    },

    // MODULE INCLUDE/EXTEND → META
    "keyword.module_composition": {
      layer: "meta",
      description: "Module composition",
      examples: ["include Enumerable", "extend Forwardable"],
    },

    // SUPER → CONTROL FLOW
    "keyword.super": {
      layer: "controlFlow",
      description: "Super keyword",
      examples: ["super", "super(arg)"],
    },

    // BEGIN/END → CONTROL FLOW
    "keyword.begin": {
      layer: "controlFlow",
      description: "Exception handling",
      examples: ["begin", "rescue", "ensure", "end"],
    },

    // RANGE → DATA
    range: {
      layer: "data",
      description: "Range literals",
      examples: ["1..10", "1...10"],
    },
  },
};
