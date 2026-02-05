import type { LanguageMapper } from "./types.js";

/**
 * Rust-specific semantic token to intent layer mappings.
 *
 * Focus areas:
 * - Ownership and borrowing
 * - Macros
 * - Async/await
 * - Pattern matching
 * - Traits and lifetimes
 * - Unsafe blocks
 */
export const rustMapper: LanguageMapper = {
  language: "rust",
  displayName: "Rust",
  extensions: [".rs"],
  mappings: {
    // Macros → Meta
    macro: {
      layer: "meta",
      description: "Rust macros",
      examples: ["println!", "vec!", "derive!"],
    },
    "macro.derive": {
      layer: "meta",
      description: "Derive macros for traits",
      examples: ["#[derive(Debug, Clone)]"],
    },

    // Attributes → Meta
    attribute: {
      layer: "meta",
      description: "Rust attributes",
      examples: ["#[inline]", "#[cfg(test)]"],
    },

    // Async/await → Control Flow
    "keyword.async": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Async functions and blocks",
      examples: ["async fn fetch()", "async { }"],
    },
    "keyword.await": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Await expressions",
      examples: [".await"],
    },

    // Borrowing → Usage
    "operator.borrow": {
      layer: "usage",
      modifiers: ["reference"],
      description: "Immutable borrow operator",
      examples: ["&value", "&self"],
    },
    "operator.borrowMut": {
      layer: "mutation",
      modifiers: ["reference"],
      description: "Mutable borrow operator",
      examples: ["&mut value", "&mut self"],
    },

    // Mutability → Mutation
    "keyword.mut": {
      layer: "mutation",
      description: "Mutable variable/reference marker",
      examples: ["let mut x", "&mut self"],
    },

    // Lifetimes → Meta
    lifetime: {
      layer: "meta",
      description: "Lifetime parameters",
      examples: ["'a", "'static", "<'a>"],
    },

    // Pattern matching → Control Flow
    "keyword.match": {
      layer: "controlFlow",
      description: "Match expressions",
      examples: ["match x { Some(v) => v }"],
    },
    "keyword.if.let": {
      layer: "controlFlow",
      description: "If-let pattern matching",
      examples: ["if let Some(v) = option"],
    },
    "keyword.while.let": {
      layer: "controlFlow",
      description: "While-let pattern matching",
      examples: ["while let Some(v) = iter.next()"],
    },

    // Traits → Declaration
    "keyword.trait": {
      layer: "declaration",
      description: "Trait declarations",
      examples: ["trait Display { }"],
    },
    "keyword.impl": {
      layer: "declaration",
      description: "Trait/type implementations",
      examples: ["impl Display for User { }"],
    },

    // Type bounds → Meta
    "keyword.where": {
      layer: "meta",
      description: "Where clauses for trait bounds",
      examples: ["where T: Display + Clone"],
    },

    // Unsafe → Meta (highlight as special)
    "keyword.unsafe": {
      layer: "meta",
      modifiers: ["unsafe"],
      description: "Unsafe blocks/functions",
      examples: ["unsafe { }", "unsafe fn raw()"],
    },

    // Move semantics → Mutation
    "keyword.move": {
      layer: "mutation",
      description: "Move closures",
      examples: ["move || { }"],
    },

    // Self types → Usage
    "type.self": {
      layer: "usage",
      description: "Self type in implementations",
      examples: ["Self", "self"],
    },

    // Associated types → Declaration
    "type.associated": {
      layer: "declaration",
      description: "Associated types in traits",
      examples: ["type Item = String"],
    },

    // Const/static → Declaration
    "keyword.const": {
      layer: "declaration",
      description: "Constant declarations",
      examples: ["const MAX: u32 = 100"],
    },
    "keyword.static": {
      layer: "declaration",
      description: "Static variable declarations",
      examples: ["static GLOBAL: AtomicUsize"],
    },

    // Module system → Meta
    "keyword.mod": {
      layer: "meta",
      description: "Module declarations",
      examples: ["mod utils { }"],
    },
    "keyword.use": {
      layer: "meta",
      description: "Use statements",
      examples: ["use std::collections::HashMap"],
    },
    "keyword.pub": {
      layer: "meta",
      description: "Visibility modifiers",
      examples: ["pub fn", "pub(crate) struct"],
    },

    // Type parameters → Declaration
    typeParameter: {
      layer: "declaration",
      description: "Generic type parameters",
      examples: ["<T>", "<T: Display>"],
    },

    // Destructuring → Declaration
    "pattern.destructure": {
      layer: "declaration",
      description: "Destructuring patterns",
      examples: ["let (x, y) = tuple", "Some(value)"],
    },

    // Range operators → Data
    "operator.range": {
      layer: "data",
      description: "Range expressions",
      examples: ["0..10", "..=5", "start.."],
    },

    // Question mark operator → Control Flow
    "operator.try": {
      layer: "controlFlow",
      description: "Try operator for error propagation",
      examples: ["result?"],
    },

    // Raw identifiers → Meta
    "identifier.raw": {
      layer: "meta",
      description: "Raw identifiers",
      examples: ["r#type", "r#match"],
    },

    // Documentation → Documentation
    "comment.doc": {
      layer: "documentation",
      description: "Documentation comments",
      examples: ["/// Doc comment", "//! Module docs"],
    },

    // Turbofish → Meta
    "operator.turbofish": {
      layer: "meta",
      description: "Turbofish operator for type hints",
      examples: ["collect::<Vec<_>>()"],
    },
  },
};
