/**
 * Vitest setup file
 */

// Provide Node's `assert` globally for legacy tests that use `assert.*` helpers
import assert from "node:assert/strict";

(globalThis as unknown as { assert: typeof assert }).assert = assert;

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { vi } from "vitest";

const style = document.createElement("style");
style.textContent = [
  resolve(process.cwd(), "src/vue-app/styles/reset.css"),
  resolve(process.cwd(), "src/vue-app/styles/variables.css"),
  resolve(process.cwd(), "src/vue-app/styles/semantic-tokens.css"),
  resolve(process.cwd(), "src/vue-app/styles/color-utilities.css"),
  resolve(process.cwd(), "src/vue-app/styles/globals.css"),
]
  .map(path => readFileSync(path, "utf8"))
  .join("\n");
document.head.appendChild(style);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// biome-ignore lint/suspicious/noExplicitAny: localStorage mock requires any type
global.localStorage = localStorageMock as any;

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Default fetch mock to prevent tests from making real network requests in CI.
// Tests can override this with `vi.fn().mockResolvedValueOnce(...)` or
// `mockRejectedValueOnce(...)` as needed.
const defaultFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : String((input as Request).url || "");

  if (url.includes("/themes-manifest.json") || url.endsWith("themes-manifest.json")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        defaultThemeKey: "deep-sable-balanced",
        seeds: [],
        harmonies: [],
        themes: {},
      }),
    } as unknown as Response;
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({}),
  } as unknown as Response;
}) as unknown as (input: RequestInfo | URL) => Promise<Response>;

(globalThis as unknown as { fetch: (input: RequestInfo | URL) => Promise<Response> }).fetch =
  defaultFetch;

// Basic Canvas 2D mock to avoid DOM/canvas errors in jsdom during tests
// Provides minimal methods used by our rendering helpers
if (!HTMLCanvasElement.prototype.getContext) {
  // Provide a very small, untyped stub for the 2D canvas context to avoid
  // runtime failures in jsdom during tests. We purposely keep this non-strict
  // to minimize assumptions about the rendering code.
  // Assign to prototype via a safe `unknown` cast to avoid strict any warnings
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).getContext = (
    type: string
  ) => {
    if (type === "2d") {
      const ctx: unknown = {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        fillText: () => {},
        measureText: () => ({ width: 0 }),
        translate: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        arc: () => {},
        stroke: () => {},
        fill: () => {},
        fillStyle: "",
        strokeStyle: "",
        globalAlpha: 1,
      };
      // Provide a minimal typed cast so TypeScript and linting are satisfied
      return ctx as unknown as CanvasRenderingContext2D;
    }
    return null;
  };
}
