// Block loading of @vitest/expect in Node processes where it conflicts with Playwright
// This is required to prevent Symbol redefinition errors when Playwright and Vitest
// are present in the same repository and both try to define Jest-like matchers.

const Module = require("node:module");
const originalRequire = Module.prototype.require;

Module.prototype.require = function (...args) {
  const [id] = args;
  try {
    // Normalize id to handle both scoped and nested resolutions
    if (
      typeof id === "string" &&
      (id === "@vitest/expect" ||
        id.includes("/@vitest/expect") ||
        id.endsWith("@vitest/expect") ||
        id === "vitest" ||
        id.startsWith("vitest/"))
    ) {
      // Return a lightweight stub to satisfy imports without executing the real module
      return {};
    }
  } catch (_err) {
    // swallow
  }
  return originalRequire.apply(this, args);
};
