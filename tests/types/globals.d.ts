/**
 * Ambient declarations for globals installed by tests/setup.ts.
 *
 * Vitest runs with `globals: false`, so the only test global is the one the
 * setup file injects explicitly: Node's strict `assert`, kept for legacy tests
 * that predate the `expect` API. Declaring it here lets those files type-check
 * without rewriting their assertions.
 */
import type nodeAssert from "node:assert/strict";

declare global {
  // `var` is required here: `let`/`const` do not create global bindings.
  var assert: typeof nodeAssert;
}
