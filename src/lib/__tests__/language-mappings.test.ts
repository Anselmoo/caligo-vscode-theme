/**
 * Unit tests for language-specific intent resolution
 */

import { describe, expect, it } from "vitest";
import { resolveIntent } from "../language-mappings/index.js";

describe("resolveIntent", () => {
  describe("Python-specific mappings", () => {
    it("should map Python decorators to meta layer", () => {
      const result = resolveIntent("decorator", [], "python");
      expect(result).toBe("meta");
    });

    it("should map async functions to controlFlow layer", () => {
      const result = resolveIntent("function", ["async"], "python");
      expect(result).toBe("controlFlow");
    });

    it("should map comprehensions to data layer", () => {
      const result = resolveIntent("variable", ["comprehension"], "python");
      expect(result).toBe("data");
    });

    it("should map dunder methods to meta layer", () => {
      const result = resolveIntent("method", ["magic"], "python");
      expect(result).toBe("meta");
    });
  });

  describe("Rust-specific mappings", () => {
    it("should map macros to meta layer", () => {
      const result = resolveIntent("macro", [], "rust");
      assert.equal(result, "meta");
    });

    it("should map immutable borrows to usage layer", () => {
      const result = resolveIntent("operator", ["borrow"], "rust");
      expect(result).toBe("usage");
    });

    it("should map mutable borrows to mutation layer", () => {
      const result = resolveIntent("operator", ["borrowMut"], "rust");
      expect(result).toBe("mutation");
    });

    it("should map async keywords to controlFlow layer", () => {
      const result = resolveIntent("keyword", ["async"], "rust");
      expect(result).toBe("controlFlow");
    });

    it("should map lifetimes to meta layer", () => {
      const result = resolveIntent("lifetime", [], "rust");
      assert.equal(result, "meta");
    });
  });

  describe("Go-specific mappings", () => {
    it("should map go keyword to controlFlow layer", () => {
      const result = resolveIntent("keyword", ["go"], "go");
      expect(result).toBe("controlFlow");
    });

    it("should map channels to controlFlow layer", () => {
      const result = resolveIntent("type", ["chan"], "go");
      expect(result).toBe("controlFlow");
    });

    it("should map defer to controlFlow layer", () => {
      const result = resolveIntent("keyword", ["defer"], "go");
      assert.equal(result, "controlFlow");
    });

    it("should map struct tags to meta layer", () => {
      const result = resolveIntent("string", ["structTag"], "go");
      assert.equal(result, "meta");
    });
  });

  describe("Kotlin-specific mappings", () => {
    it("should map suspend keyword to controlFlow layer", () => {
      const result = resolveIntent("keyword", ["suspend"], "kotlin");
      assert.equal(result, "controlFlow");
    });

    it("should map delegation keyword to meta layer", () => {
      const result = resolveIntent("keyword", ["by"], "kotlin");
      assert.equal(result, "meta");
    });

    it("should map sealed keyword to meta layer", () => {
      const result = resolveIntent("keyword", ["sealed"], "kotlin");
      assert.equal(result, "meta");
    });

    it("should map nullable types to usage layer", () => {
      const result = resolveIntent("type", ["nullable"], "kotlin");
      assert.equal(result, "usage");
    });
  });

  describe("C#-specific mappings", () => {
    it("should map async keyword to controlFlow layer", () => {
      const result = resolveIntent("keyword", ["async"], "csharp");
      assert.equal(result, "controlFlow");
    });

    it("should map LINQ from to controlFlow layer", () => {
      const result = resolveIntent("keyword", ["from"], "csharp");
      assert.equal(result, "controlFlow");
    });

    it("should map property getter to declaration layer", () => {
      const result = resolveIntent("keyword", ["get"], "csharp");
      assert.equal(result, "declaration");
    });

    it("should map property setter to mutation layer", () => {
      const result = resolveIntent("keyword", ["set"], "csharp");
      assert.equal(result, "mutation");
    });

    it("should map record keyword to declaration layer", () => {
      const result = resolveIntent("keyword", ["record"], "csharp");
      assert.equal(result, "declaration");
    });
  });

  describe("C++-specific mappings", () => {
    it("should map template keyword to declaration layer", () => {
      const result = resolveIntent("keyword", ["template"], "cpp");
      assert.equal(result, "declaration");
    });

    it("should map concept keyword to meta layer", () => {
      const result = resolveIntent("keyword", ["concept"], "cpp");
      assert.equal(result, "meta");
    });

    it("should map constexpr keyword to meta layer", () => {
      const result = resolveIntent("keyword", ["constexpr"], "cpp");
      assert.equal(result, "meta");
    });

    it("should map move operator to mutation layer", () => {
      const result = resolveIntent("operator", ["move"], "cpp");
      assert.equal(result, "mutation");
    });

    it("should map virtual keyword to meta layer", () => {
      const result = resolveIntent("keyword", ["virtual"], "cpp");
      assert.equal(result, "meta");
    });
  });

  describe("Lua-specific mappings", () => {
    it("should map colon operator to usage layer", () => {
      const result = resolveIntent("operator", ["colon"], "lua");
      assert.equal(result, "usage");
    });

    it("should map metatable functions to meta layer", () => {
      const result = resolveIntent("function", ["metatable"], "lua");
      assert.equal(result, "meta");
    });

    it("should map coroutine functions to controlFlow layer", () => {
      const result = resolveIntent("function", ["coroutine"], "lua");
      assert.equal(result, "controlFlow");
    });

    it("should map table type to data layer", () => {
      const result = resolveIntent("type", ["table"], "lua");
      assert.equal(result, "data");
    });
  });

  describe("Ruby-specific mappings", () => {
    it("should map block methods to declaration layer", () => {
      const result = resolveIntent("method", ["block"], "ruby");
      assert.equal(result, "declaration");
    });

    it("should map symbols to data layer", () => {
      const result = resolveIntent("symbol", [], "ruby");
      assert.equal(result, "data");
    });

    it("should map metaprogramming methods to meta layer", () => {
      const result = resolveIntent("method", ["metaprogramming"], "ruby");
      assert.equal(result, "meta");
    });

    it("should map yield keyword to controlFlow layer", () => {
      const result = resolveIntent("keyword", ["yield"], "ruby");
      assert.equal(result, "controlFlow");
    });
  });

  describe("Java-specific mappings", () => {
    it("should map decorators to meta layer", () => {
      const result = resolveIntent("decorator", [], "java");
      expect(result).toBe("meta");
    });

    it("should map @Override decorator to documentation layer", () => {
      const result = resolveIntent("decorator", ["override"], "java");
      assert.equal(result, "documentation");
    });

    it("should map type parameters to declaration layer", () => {
      const result = resolveIntent("typeParameter", [], "java");
      assert.equal(result, "declaration");
    });

    it("should map synchronized keyword to controlFlow layer", () => {
      const result = resolveIntent("keyword", ["synchronized"], "java");
      assert.equal(result, "controlFlow");
    });
  });

  describe("Shell-specific mappings", () => {
    it("should map pipe operator to controlFlow layer", () => {
      const result = resolveIntent("operator", ["pipe"], "shellscript");
      assert.equal(result, "controlFlow");
    });

    it("should map redirect operator to controlFlow layer", () => {
      const result = resolveIntent("operator", ["redirect"], "shellscript");
      assert.equal(result, "controlFlow");
    });

    it("should map variable expansion to usage layer", () => {
      const result = resolveIntent("variable", ["expansion"], "shellscript");
      assert.equal(result, "usage");
    });

    it("should map heredoc strings to data layer", () => {
      const result = resolveIntent("string", ["heredoc"], "shellscript");
      assert.equal(result, "data");
    });
  });

  describe("Fallback behavior", () => {
    it("should fall back to default mapping when no language-specific rule exists", () => {
      const result = resolveIntent("class", [], "python");
      assert.equal(result, "declaration");
    });

    it("should fall back to usage layer for unknown tokens", () => {
      const result = resolveIntent("unknownToken", [], "python");
      assert.equal(result, "usage");
    });

    it("should work without language parameter", () => {
      const result = resolveIntent("class", []);
      assert.equal(result, "declaration");
    });

    it("should handle unknown language gracefully", () => {
      // biome-ignore lint: testing invalid language parameter
      const result = resolveIntent("class", [], "unknownLang" as any);
      assert.equal(result, "declaration");
    });
  });

  describe("Cross-language consistency", () => {
    it("should map decorators/attributes to meta across languages", () => {
      const pythonResult = resolveIntent("decorator", [], "python");
      const rustResult = resolveIntent("attribute", [], "rust");
      const javaResult = resolveIntent("decorator", [], "java");
      const csharpResult = resolveIntent("attribute", [], "csharp");

      assert.equal(pythonResult, "meta");
      assert.equal(rustResult, "meta");
      assert.equal(javaResult, "meta");
      assert.equal(csharpResult, "meta");
    });

    it("should map async patterns to controlFlow across languages", () => {
      const pythonAsync = resolveIntent("function", ["async"], "python");
      const rustAsync = resolveIntent("keyword", ["async"], "rust");
      const kotlinAsync = resolveIntent("keyword", ["suspend"], "kotlin");
      const csharpAsync = resolveIntent("keyword", ["async"], "csharp");

      assert.equal(pythonAsync, "controlFlow");
      assert.equal(rustAsync, "controlFlow");
      assert.equal(kotlinAsync, "controlFlow");
      assert.equal(csharpAsync, "controlFlow");
    });

    it("should map goroutines/coroutines to controlFlow across languages", () => {
      const goGoroutine = resolveIntent("keyword", ["go"], "go");
      const luaCoroutine = resolveIntent("function", ["coroutine"], "lua");

      assert.equal(goGoroutine, "controlFlow");
      assert.equal(luaCoroutine, "controlFlow");
    });
  });
});
