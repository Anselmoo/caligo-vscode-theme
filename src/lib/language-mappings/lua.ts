import type { LanguageMapper } from "./types.js";

/**
 * Lua-specific semantic token to intent layer mappings.
 *
 * Focus areas:
 * - Colon method calls
 * - Metatables and metamethods
 * - Multiple return values
 * - Vararg functions
 * - Tables as data structures
 * - Local vs global scope
 */
export const luaMapper: LanguageMapper = {
  language: "lua",
  displayName: "Lua",
  extensions: [".lua"],
  mappings: {
    // Colon method calls → Usage
    "operator.colon": {
      layer: "usage",
      description: "Method call operator (passes self)",
      examples: ["obj:method()", "self:update()"],
    },

    // Metatables → Meta
    "function.metatable": {
      layer: "meta",
      description: "Metatable functions",
      examples: ["setmetatable", "getmetatable"],
    },
    "variable.metamethod": {
      layer: "meta",
      description: "Metamethod names",
      examples: ["__index", "__newindex", "__call", "__tostring"],
    },

    // Local scope → Declaration
    "keyword.local": {
      layer: "declaration",
      description: "Local variable declarations",
      examples: ["local x = 10"],
    },

    // Function declarations → Declaration
    "keyword.function": {
      layer: "declaration",
      description: "Function declarations",
      examples: ["function name()", "local function()"],
    },

    // Vararg → Declaration
    "parameter.vararg": {
      layer: "declaration",
      description: "Variadic parameters",
      examples: ["function sum(...)", "local args = {...}"],
    },

    // Multiple return → Control Flow
    "keyword.return": {
      layer: "controlFlow",
      description: "Return statements (can return multiple values)",
      examples: ["return x, y, z"],
    },

    // Tables → Data
    "type.table": {
      layer: "data",
      description: "Table type (Lua's primary data structure)",
      examples: ["{}", "{1, 2, 3}", "{key = value}"],
    },

    // Table indexing → Usage
    "operator.index": {
      layer: "usage",
      description: "Table indexing",
      examples: ["t[key]", "t.field"],
    },

    // Require/module → Meta
    "function.require": {
      layer: "meta",
      description: "Module loading",
      examples: ["require('module')"],
    },
    "keyword.module": {
      layer: "meta",
      description: "Module definition (Lua 5.1)",
      examples: ["module('name', package.seeall)"],
    },

    // Coroutines → Control Flow
    "function.coroutine": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Coroutine functions",
      examples: ["coroutine.create", "coroutine.yield", "coroutine.resume"],
    },

    // Pairs/ipairs → Control Flow
    "function.iterator": {
      layer: "controlFlow",
      description: "Iterator functions",
      examples: ["pairs(t)", "ipairs(arr)", "next(t)"],
    },

    // Goto/labels → Control Flow
    "keyword.goto": {
      layer: "controlFlow",
      description: "Goto statements (Lua 5.2+)",
      examples: ["goto label", "::label::"],
    },

    // Global _G → Meta
    "variable.global": {
      layer: "meta",
      description: "Global environment table",
      examples: ["_G", "_ENV"],
    },

    // String patterns → Data
    "string.pattern": {
      layer: "data",
      description: "String pattern matching",
      examples: ["string.match(s, '%d+')", "string.gsub"],
    },

    // Self parameter → Usage
    "parameter.self": {
      layer: "usage",
      description: "Implicit self parameter in methods",
      examples: ["function obj:method(self)"],
    },

    // Nil → Data
    "keyword.nil": {
      layer: "data",
      description: "Nil value",
      examples: ["if x == nil then"],
    },

    // Repeat-until → Control Flow
    "keyword.repeat": {
      layer: "controlFlow",
      description: "Repeat-until loop",
      examples: ["repeat ... until condition"],
    },

    // Chunk loading → Meta
    "function.load": {
      layer: "meta",
      description: "Dynamic code loading",
      examples: ["load(chunk)", "loadfile(filename)"],
    },

    // Debug library → Meta
    "function.debug": {
      layer: "meta",
      description: "Debug library functions",
      examples: ["debug.getinfo", "debug.traceback"],
    },

    // Bit operations → Data (Lua 5.2+)
    "operator.bitwise": {
      layer: "data",
      description: "Bitwise operators",
      examples: ["&", "|", "~", "<<", ">>"],
    },

    // Length operator → Usage
    "operator.length": {
      layer: "usage",
      description: "Length operator",
      examples: ["#table", "#string"],
    },

    // Concatenation → Data
    "operator.concat": {
      layer: "data",
      description: "String concatenation",
      examples: ["'hello' .. 'world'"],
    },
  },
};
