/**
 * Java Language Intent Mappings
 *
 * Maps Java-specific semantic tokens to intent layers.
 * Handles Java idioms like annotations, generics, static members, etc.
 */

import type { LanguageMapper } from "./types.js";

export const javaMapper: LanguageMapper = {
  language: "java",
  displayName: "Java",
  extensions: [".java"],

  mappings: {
    // ANNOTATIONS → META LAYER
    decorator: {
      layer: "meta",
      description: "Java annotations",
      examples: ["@Override", "@Deprecated", "@SuppressWarnings"],
    },

    // @Override specifically → DOCUMENTATION
    "decorator.override": {
      layer: "documentation",
      description: "Override annotations",
      examples: ["@Override"],
    },

    // INTERFACE/CLASS DECLARATIONS → DECLARATION
    "interface.declaration": {
      layer: "declaration",
      description: "Interface definitions",
      examples: ["interface Runnable {"],
    },

    // GENERICS → DECLARATION
    typeParameter: {
      layer: "declaration",
      description: "Generic type parameters",
      examples: ["<T>", "<K, V>", "<? extends Number>"],
    },

    // STATIC MEMBERS → USAGE (with modifier)
    "method.static": {
      layer: "usage",
      modifiers: ["static"],
      description: "Static method calls",
      examples: ["Math.max()", "Collections.sort()"],
    },

    "property.static": {
      layer: "usage",
      modifiers: ["static"],
      description: "Static field access",
      examples: ["Integer.MAX_VALUE", "System.out"],
    },

    // SYNCHRONIZED → CONTROL FLOW
    "keyword.synchronized": {
      layer: "controlFlow",
      description: "Synchronized blocks",
      examples: ["synchronized (lock) {"],
    },

    // FINAL → readonly modifier
    "variable.final": {
      layer: "usage",
      modifiers: ["readonly"],
      description: "Final variables",
      examples: ["final int MAX = 100"],
    },

    // THIS/SUPER → USAGE
    "variable.this": {
      layer: "usage",
      modifiers: ["builtin"],
      description: "This reference",
      examples: ["this.field", "this.method()"],
    },

    "keyword.super": {
      layer: "controlFlow",
      description: "Super calls",
      examples: ["super()", "super.method()"],
    },

    // THROWS → CONTROL FLOW
    "keyword.throws": {
      layer: "controlFlow",
      description: "Exception declarations",
      examples: ["throws IOException"],
    },

    // TRY-CATCH → CONTROL FLOW
    "keyword.try": {
      layer: "controlFlow",
      description: "Exception handling",
      examples: ["try {", "catch (Exception e)", "finally {"],
    },

    // NEW → MUTATION (object creation)
    "keyword.new": {
      layer: "mutation",
      description: "Object instantiation",
      examples: ["new ArrayList<>()", "new String[]"],
    },

    // INSTANCEOF → CONTROL FLOW
    "keyword.instanceof": {
      layer: "controlFlow",
      description: "Type checking",
      examples: ["obj instanceof String"],
    },

    // LAMBDA → CONTROL FLOW
    "operator.lambda": {
      layer: "controlFlow",
      description: "Lambda expressions",
      examples: ["x -> x * 2", "(a, b) -> a + b"],
    },

    // METHOD REFERENCES → CONTROL FLOW
    "operator.methodReference": {
      layer: "controlFlow",
      description: "Method references",
      examples: ["String::length", "System.out::println"],
    },

    // ENUM CONSTANTS → DATA
    enumMember: {
      layer: "data",
      description: "Enum constant references",
      examples: ["DayOfWeek.MONDAY", "Color.RED"],
    },

    // PACKAGE/IMPORT → DECLARATION
    "keyword.package": {
      layer: "declaration",
      description: "Package declarations",
      examples: ["package com.example.app"],
    },

    "keyword.import": {
      layer: "declaration",
      description: "Import statements",
      examples: ["import java.util.List"],
    },

    // ASSERT → CONTROL FLOW
    "keyword.assert": {
      layer: "controlFlow",
      description: "Assertions",
      examples: ["assert value != null : message"],
    },

    // VAR (Java 10+) → DECLARATION
    "keyword.var": {
      layer: "declaration",
      description: "Local variable type inference",
      examples: ["var list = new ArrayList<>()"],
    },

    // RECORD (Java 14+) → DECLARATION
    "keyword.record": {
      layer: "declaration",
      description: "Record types",
      examples: ["record Point(int x, int y) {}"],
    },

    // SEALED (Java 17+) → META
    "keyword.sealed": {
      layer: "meta",
      description: "Sealed class modifiers",
      examples: ["sealed class Shape permits Circle"],
    },
  },
};
