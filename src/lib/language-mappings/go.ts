import type { LanguageMapper } from "./types.js";

/**
 * Go-specific semantic token to intent layer mappings.
 *
 * Focus areas:
 * - Goroutines and channels
 * - Defer statements
 * - Error handling patterns
 * - Struct tags
 * - Interface types
 * - Pointer operations
 */
export const goMapper: LanguageMapper = {
  language: "go",
  displayName: "Go",
  extensions: [".go"],
  mappings: {
    // Goroutines → Control Flow
    "keyword.go": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Goroutine invocation",
      examples: ["go func() { }"],
    },

    // Channels → Control Flow
    "type.chan": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Channel types",
      examples: ["chan int", "chan<- string", "<-chan bool"],
    },
    "operator.channel": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Channel send/receive operators",
      examples: ["ch <- value", "value := <-ch"],
    },

    // Select statements → Control Flow
    "keyword.select": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Select statement for channel multiplexing",
      examples: ["select { case <-ch: }"],
    },

    // Defer → Control Flow
    "keyword.defer": {
      layer: "controlFlow",
      description: "Defer statement for cleanup",
      examples: ["defer file.Close()"],
    },

    // Panic/Recover → Control Flow
    "keyword.panic": {
      layer: "controlFlow",
      description: "Panic for runtime errors",
      examples: ['panic("error")'],
    },
    "keyword.recover": {
      layer: "controlFlow",
      description: "Recover from panics",
      examples: ["recover()"],
    },

    // Error handling pattern → Usage
    "variable.error": {
      layer: "usage",
      description: "Error return values",
      examples: ["err error", "if err != nil"],
    },

    // Struct tags → Meta
    "string.structTag": {
      layer: "meta",
      description: "Struct field tags",
      examples: ['`json:"name" db:"user_name"`'],
    },

    // Interface type → Declaration
    "keyword.interface": {
      layer: "declaration",
      description: "Interface declarations",
      examples: ["type Writer interface { }"],
    },

    // Type embedding → Meta
    "type.embedded": {
      layer: "meta",
      description: "Embedded types in structs",
      examples: ["struct { User; AdminPerms }"],
    },

    // Pointer operations → Usage/Mutation
    "operator.address": {
      layer: "usage",
      description: "Address-of operator",
      examples: ["&variable"],
    },
    "operator.dereference": {
      layer: "usage",
      description: "Pointer dereference",
      examples: ["*pointer"],
    },

    // Method receivers → Declaration
    "parameter.receiver": {
      layer: "declaration",
      description: "Method receivers",
      examples: ["func (s *Service) Method()"],
    },

    // Type assertions → Control Flow
    "operator.typeAssertion": {
      layer: "controlFlow",
      description: "Type assertions",
      examples: ["value.(string)", "v, ok := i.(int)"],
    },

    // Type switches → Control Flow
    "keyword.type": {
      layer: "controlFlow",
      description: "Type switches",
      examples: ["switch v := i.(type)"],
    },

    // Package-level → Meta
    "keyword.package": {
      layer: "meta",
      description: "Package declaration",
      examples: ["package main"],
    },
    "keyword.import": {
      layer: "meta",
      description: "Import declarations",
      examples: ['import "fmt"'],
    },

    // Blank identifier → Meta
    "variable.blank": {
      layer: "meta",
      description: "Blank identifier for unused values",
      examples: ["_ = unused", "for _, v := range"],
    },

    // Make/new → Mutation
    "keyword.make": {
      layer: "mutation",
      description: "Memory allocation for slices/maps/channels",
      examples: ["make([]int, 0)", "make(chan int)"],
    },
    "keyword.new": {
      layer: "mutation",
      description: "Memory allocation for types",
      examples: ["new(User)"],
    },

    // Range → Control Flow
    "keyword.range": {
      layer: "controlFlow",
      description: "Range iteration",
      examples: ["for k, v := range map"],
    },

    // Variadic functions → Declaration
    "parameter.variadic": {
      layer: "declaration",
      description: "Variadic parameters",
      examples: ["func sum(nums ...int)"],
    },

    // Init functions → Meta
    "function.init": {
      layer: "meta",
      description: "Package initialization functions",
      examples: ["func init() { }"],
    },

    // Build constraints → Meta
    "comment.buildTag": {
      layer: "meta",
      description: "Build tags and constraints",
      examples: ["//go:build linux", "// +build !windows"],
    },
  },
};
