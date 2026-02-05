import type { LanguageMapper } from "./types.js";

/**
 * C++-specific semantic token to intent layer mappings.
 *
 * Focus areas:
 * - Templates and concepts
 * - RAII and smart pointers
 * - Move semantics
 * - Constexpr/consteval
 * - Virtual/override
 * - Namespaces
 */
export const cppMapper: LanguageMapper = {
  language: "cpp",
  displayName: "C++",
  extensions: [".cpp", ".cc", ".cxx", ".hpp", ".hxx", ".h"],
  mappings: {
    // Templates → Declaration
    "keyword.template": {
      layer: "declaration",
      description: "Template declarations",
      examples: ["template<typename T>"],
    },
    typeParameter: {
      layer: "declaration",
      description: "Template type parameters",
      examples: ["typename T", "class T"],
    },

    // Concepts (C++20) → Meta
    "keyword.concept": {
      layer: "meta",
      description: "Concept definitions",
      examples: ["concept Sortable = requires(T t) { ... }"],
    },
    "keyword.requires": {
      layer: "meta",
      description: "Requires clauses",
      examples: ["requires std::integral<T>"],
    },

    // Constexpr/consteval → Meta
    "keyword.constexpr": {
      layer: "meta",
      description: "Compile-time constant expressions",
      examples: ["constexpr int max()", "constexpr int N = 10"],
    },
    "keyword.consteval": {
      layer: "meta",
      description: "Immediate functions (C++20)",
      examples: ["consteval int compute()"],
    },
    "keyword.constinit": {
      layer: "meta",
      description: "Constant initialization (C++20)",
      examples: ["constinit int global = 0"],
    },

    // Virtual/override → Meta
    "keyword.virtual": {
      layer: "meta",
      description: "Virtual functions",
      examples: ["virtual void draw()"],
    },
    "keyword.override": {
      layer: "meta",
      description: "Override specifier",
      examples: ["void draw() override"],
    },
    "keyword.final": {
      layer: "meta",
      description: "Final specifier",
      examples: ["class Sealed final { }", "void draw() final"],
    },

    // Move semantics → Mutation
    "operator.move": {
      layer: "mutation",
      description: "Move semantics",
      examples: ["std::move(obj)", "T&&"],
    },
    "type.rvalueReference": {
      layer: "mutation",
      description: "Rvalue references",
      examples: ["T&&", "int&& x"],
    },

    // Smart pointers → Usage
    "type.smartPointer": {
      layer: "usage",
      description: "Smart pointer types",
      examples: ["std::unique_ptr", "std::shared_ptr", "std::weak_ptr"],
    },

    // Pointers and references → Usage
    "operator.dereference": {
      layer: "usage",
      description: "Pointer dereference",
      examples: ["*ptr"],
    },
    "operator.addressOf": {
      layer: "usage",
      description: "Address-of operator",
      examples: ["&variable"],
    },
    "operator.arrow": {
      layer: "usage",
      description: "Member access through pointer",
      examples: ["ptr->member"],
    },

    // Namespaces → Meta
    "keyword.namespace": {
      layer: "meta",
      description: "Namespace declarations",
      examples: ["namespace utils { }"],
    },
    "keyword.using": {
      layer: "meta",
      description: "Using declarations/directives",
      examples: ["using namespace std", "using std::vector"],
    },

    // Const correctness → Usage
    "keyword.const": {
      layer: "usage",
      modifiers: ["readonly"],
      description: "Const qualifier",
      examples: ["const int x", "void func() const"],
    },

    // Noexcept → Meta
    "keyword.noexcept": {
      layer: "meta",
      description: "Noexcept specifier",
      examples: ["void func() noexcept"],
    },

    // Static → Declaration/Meta
    "keyword.static": {
      layer: "declaration",
      description: "Static storage/linkage",
      examples: ["static int counter", "static void helper()"],
    },

    // Inline → Meta
    "keyword.inline": {
      layer: "meta",
      description: "Inline specifier",
      examples: ["inline int max()"],
    },

    // Auto type deduction → Declaration
    "keyword.auto": {
      layer: "declaration",
      description: "Type deduction",
      examples: ["auto x = 10", "auto lambda = []() {}"],
    },
    "keyword.decltype": {
      layer: "declaration",
      description: "Decltype specifier",
      examples: ["decltype(x) y"],
    },

    // Lambda expressions → Declaration
    "operator.lambda": {
      layer: "declaration",
      modifiers: ["lambda"],
      description: "Lambda expressions",
      examples: ["[](int x) { return x * 2; }"],
    },
    "keyword.capture": {
      layer: "usage",
      description: "Lambda capture lists",
      examples: ["[&]", "[=]", "[this]", "[x, &y]"],
    },

    // Explicit/delete → Meta
    "keyword.explicit": {
      layer: "meta",
      description: "Explicit constructors",
      examples: ["explicit MyClass(int)"],
    },
    "keyword.delete": {
      layer: "meta",
      description: "Deleted functions",
      examples: ["MyClass(const MyClass&) = delete"],
    },
    "keyword.default": {
      layer: "meta",
      description: "Defaulted functions",
      examples: ["MyClass() = default"],
    },

    // Friend → Meta
    "keyword.friend": {
      layer: "meta",
      description: "Friend declarations",
      examples: ["friend class Helper"],
    },

    // New/delete → Mutation
    "keyword.new": {
      layer: "mutation",
      description: "Dynamic memory allocation",
      examples: ["new int[10]", "new MyClass()"],
    },
    "keyword.delete.operator": {
      layer: "mutation",
      description: "Dynamic memory deallocation",
      examples: ["delete ptr", "delete[] arr"],
    },

    // Sizeof → Usage
    "keyword.sizeof": {
      layer: "usage",
      description: "Sizeof operator",
      examples: ["sizeof(int)", "sizeof(arr)"],
    },

    // Alignas/alignof → Meta
    "keyword.alignas": {
      layer: "meta",
      description: "Alignment specifier",
      examples: ["alignas(16) int x"],
    },
    "keyword.alignof": {
      layer: "usage",
      description: "Alignment query",
      examples: ["alignof(MyClass)"],
    },

    // Try/catch → Control Flow
    "keyword.try": {
      layer: "controlFlow",
      description: "Exception handling try block",
      examples: ["try { } catch (const Exception& e) { }"],
    },
    "keyword.catch": {
      layer: "controlFlow",
      description: "Exception catch block",
      examples: ["catch (const std::exception& e)"],
    },
    "keyword.throw": {
      layer: "controlFlow",
      description: "Throw exceptions",
      examples: ["throw std::runtime_error()"],
    },

    // Structured bindings (C++17) → Declaration
    "variable.structuredBinding": {
      layer: "declaration",
      description: "Structured bindings",
      examples: ["auto [x, y] = pair"],
    },

    // Attributes → Meta
    attribute: {
      layer: "meta",
      description: "C++ attributes",
      examples: ["[[nodiscard]]", "[[maybe_unused]]", "[[deprecated]]"],
    },

    // Preprocessor → Meta
    "keyword.preprocessor": {
      layer: "meta",
      description: "Preprocessor directives",
      examples: ["#define", "#include", "#ifdef", "#pragma"],
    },
  },
};
