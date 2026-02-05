import type { LanguageMapper } from "./types.js";

/**
 * C#-specific semantic token to intent layer mappings.
 *
 * Focus areas:
 * - Async/await
 * - LINQ expressions
 * - Properties and events
 * - Attributes
 * - Nullable reference types
 * - Records and pattern matching
 */
export const csharpMapper: LanguageMapper = {
  language: "csharp",
  displayName: "C#",
  extensions: [".cs", ".csx"],
  mappings: {
    // Async/await → Control Flow
    "keyword.async": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Async methods",
      examples: ["async Task<int> FetchAsync()"],
    },
    "keyword.await": {
      layer: "controlFlow",
      modifiers: ["async"],
      description: "Await expressions",
      examples: ["await FetchAsync()"],
    },

    // LINQ → Control Flow
    "keyword.query": {
      layer: "controlFlow",
      description: "LINQ query keywords",
      examples: ["from", "where", "select", "orderby", "group by"],
    },
    "keyword.from": {
      layer: "controlFlow",
      description: "LINQ from clause",
      examples: ["from x in collection"],
    },
    "keyword.select": {
      layer: "controlFlow",
      description: "LINQ select projection",
      examples: ["select x.Name"],
    },
    "keyword.where": {
      layer: "controlFlow",
      description: "LINQ where filter",
      examples: ["where x > 0"],
    },

    // Properties → Declaration
    "keyword.get": {
      layer: "declaration",
      description: "Property getter",
      examples: ["public int Age { get; }"],
    },
    "keyword.set": {
      layer: "mutation",
      description: "Property setter",
      examples: ["public int Age { get; set; }"],
    },
    "keyword.init": {
      layer: "declaration",
      description: "Init-only setter (C# 9)",
      examples: ["public int Id { get; init; }"],
    },

    // Events → Declaration
    "keyword.event": {
      layer: "declaration",
      description: "Event declarations",
      examples: ["public event EventHandler Click"],
    },
    "keyword.add": {
      layer: "mutation",
      description: "Event add accessor",
      examples: ["add { }"],
    },
    "keyword.remove": {
      layer: "mutation",
      description: "Event remove accessor",
      examples: ["remove { }"],
    },

    // Delegates → Declaration
    "keyword.delegate": {
      layer: "declaration",
      description: "Delegate declarations",
      examples: ["delegate void Action()"],
    },

    // Attributes → Meta
    attribute: {
      layer: "meta",
      description: "C# attributes",
      examples: ["[Serializable]", "[HttpGet]", "[Required]"],
    },

    // Nullable reference types → Usage
    "type.nullable": {
      layer: "usage",
      modifiers: ["nullable"],
      description: "Nullable reference types",
      examples: ["string?", "int?"],
    },
    "operator.nullCoalescing": {
      layer: "usage",
      description: "Null-coalescing operators",
      examples: ["??", "??="],
    },
    "operator.nullConditional": {
      layer: "usage",
      description: "Null-conditional operators",
      examples: ["?.member", "?[index]"],
    },

    // Records (C# 9) → Declaration
    "keyword.record": {
      layer: "declaration",
      description: "Record types",
      examples: ["record Person(string Name, int Age)"],
    },
    "keyword.with": {
      layer: "mutation",
      description: "With expressions for records",
      examples: ["person with { Age = 30 }"],
    },

    // Pattern matching → Control Flow
    "keyword.switch.expression": {
      layer: "controlFlow",
      description: "Switch expressions (C# 8)",
      examples: ["x switch { 1 => 'one', _ => 'other' }"],
    },
    "keyword.is": {
      layer: "controlFlow",
      description: "Type testing and pattern matching",
      examples: ["if (x is int n)", "x is not null"],
    },
    "pattern.discard": {
      layer: "meta",
      description: "Discard pattern",
      examples: ["_"],
    },

    // Lambda expressions → Declaration
    "operator.lambda": {
      layer: "declaration",
      modifiers: ["lambda"],
      description: "Lambda expressions",
      examples: ["x => x * 2", "(x, y) => x + y"],
    },

    // Var type inference → Declaration
    "keyword.var": {
      layer: "declaration",
      description: "Implicitly typed variables",
      examples: ["var list = new List<int>()"],
    },

    // Dynamic → Meta
    "keyword.dynamic": {
      layer: "meta",
      description: "Dynamic type",
      examples: ["dynamic obj = GetObject()"],
    },

    // Yield → Control Flow
    "keyword.yield": {
      layer: "controlFlow",
      description: "Iterator yield return/break",
      examples: ["yield return item", "yield break"],
    },

    // Nameof → Usage
    "keyword.nameof": {
      layer: "usage",
      description: "Nameof expressions",
      examples: ["nameof(MyProperty)"],
    },

    // Default literal → Data
    "keyword.default": {
      layer: "data",
      description: "Default value expressions",
      examples: ["default", "default(int)"],
    },

    // Checked/unchecked → Meta
    "keyword.checked": {
      layer: "meta",
      description: "Checked arithmetic context",
      examples: ["checked { x = y * z; }"],
    },
    "keyword.unchecked": {
      layer: "meta",
      description: "Unchecked arithmetic context",
      examples: ["unchecked { x = y * z; }"],
    },

    // Using statement/declaration → Control Flow
    "keyword.using.statement": {
      layer: "controlFlow",
      description: "Using statements for disposal",
      examples: ["using (var stream = File.Open())"],
    },
    "keyword.using.declaration": {
      layer: "controlFlow",
      description: "Using declarations (C# 8)",
      examples: ["using var stream = File.Open()"],
    },

    // Lock → Control Flow
    "keyword.lock": {
      layer: "controlFlow",
      description: "Lock statements",
      examples: ["lock (syncObject) { }"],
    },

    // Unsafe → Meta
    "keyword.unsafe": {
      layer: "meta",
      modifiers: ["unsafe"],
      description: "Unsafe code blocks",
      examples: ["unsafe { int* p = &x; }"],
    },
    "keyword.fixed": {
      layer: "meta",
      description: "Fixed statements for pinning",
      examples: ["fixed (byte* p = buffer)"],
    },

    // Partial → Meta
    "keyword.partial": {
      layer: "meta",
      description: "Partial classes/methods",
      examples: ["partial class MyClass", "partial void OnInit()"],
    },

    // Virtual/override/sealed → Meta
    "keyword.virtual": {
      layer: "meta",
      description: "Virtual methods",
      examples: ["virtual void Draw()"],
    },
    "keyword.override": {
      layer: "meta",
      description: "Override methods",
      examples: ["override void Draw()"],
    },
    "keyword.sealed": {
      layer: "meta",
      description: "Sealed classes/methods",
      examples: ["sealed class Final", "sealed override void Draw()"],
    },
    "keyword.abstract": {
      layer: "meta",
      description: "Abstract classes/methods",
      examples: ["abstract class Base", "abstract void Process()"],
    },

    // Operator overloading → Declaration
    "keyword.operator": {
      layer: "declaration",
      description: "Operator overloading",
      examples: ["public static Vector operator +(Vector a, Vector b)"],
    },

    // Indexers → Declaration
    "keyword.this.indexer": {
      layer: "declaration",
      description: "Indexer declarations",
      examples: ["public int this[int i] { get; set; }"],
    },

    // Stackalloc → Mutation
    "keyword.stackalloc": {
      layer: "mutation",
      description: "Stack allocation",
      examples: ["Span<int> numbers = stackalloc int[3]"],
    },

    // Ref/out/in → Usage
    "keyword.ref": {
      layer: "usage",
      modifiers: ["reference"],
      description: "Ref parameters/returns",
      examples: ["ref int x", "ref readonly int y"],
    },
    "keyword.out": {
      layer: "mutation",
      modifiers: ["reference"],
      description: "Out parameters",
      examples: ["out int result"],
    },
    "keyword.in": {
      layer: "usage",
      modifiers: ["reference", "readonly"],
      description: "In parameters (readonly ref)",
      examples: ["in int value"],
    },

    // Tuple syntax → Data
    "type.tuple": {
      layer: "data",
      description: "Tuple types and literals",
      examples: ["(int, string)", "(1, 'hello')"],
    },

    // Range/index → Data
    "operator.range": {
      layer: "data",
      description: "Range operators (C# 8)",
      examples: ["array[1..^1]", "0..10"],
    },
    "operator.index": {
      layer: "data",
      description: "Index from end operator",
      examples: ["^1", "array[^2]"],
    },
  },
};
