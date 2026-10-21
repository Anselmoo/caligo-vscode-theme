/**
 * setTheme: View Transition, reduced-motion and re-select paths.
 *
 * useTheme keeps its index and current key at module level, so every test imports
 * a fresh module instance.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const INDEX = {
  defaultThemeKey: "night-a",
  themes: {
    "night-a": { key: "night-a", colors: { bg0: "#000001", fg0: "#ffffff", accent: "#ff0000" } },
    "night-b": { key: "night-b", colors: { bg0: "#000002", fg0: "#eeeeee", accent: "#00ff00" } },
  },
};

type StartViewTransition = (update: () => void) => {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
};

async function freshTheme() {
  vi.resetModules();
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    json: async () => INDEX,
  } as Response);
  const { useTheme } = await import("../useTheme");
  const theme = useTheme();
  await theme.loadThemeIndex();
  return theme;
}

function installViewTransition(impl: StartViewTransition) {
  const start = vi.fn(impl);
  Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });
  return start;
}

function bg0() {
  return document.documentElement.style.getPropertyValue("--bg0");
}

describe("useTheme.setTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style");
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "startViewTransition");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("switches inside a View Transition when the API is available", async () => {
    const start = installViewTransition(update => {
      update();
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      };
    });
    const { setTheme, currentThemeKey } = await freshTheme();

    setTheme("night-b");

    expect(start).toHaveBeenCalledOnce();
    expect(currentThemeKey.value).toBe("night-b");
    expect(bg0()).toBe("#000002");
  });

  it("swallows the rejections of a skipped transition", async () => {
    installViewTransition(update => {
      update();
      const skipped = () =>
        Promise.reject(new DOMException("Transition was skipped", "AbortError"));
      return { ready: skipped(), finished: skipped(), updateCallbackDone: Promise.resolve() };
    });
    const { setTheme, currentThemeKey } = await freshTheme();

    setTheme("night-b");
    // An unhandled rejection would fail the test run.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(currentThemeKey.value).toBe("night-b");
  });

  it("applies instantly without a transition when reduced motion is requested", async () => {
    const start = installViewTransition(() => {
      throw new Error("must not animate");
    });
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true } as MediaQueryList));
    const { setTheme, currentThemeKey } = await freshTheme();

    setTheme("night-b");

    expect(start).not.toHaveBeenCalled();
    expect(currentThemeKey.value).toBe("night-b");
    expect(bg0()).toBe("#000002");
  });

  it("re-applies the current theme without starting a transition", async () => {
    const start = installViewTransition(() => {
      throw new Error("must not animate");
    });
    const { setTheme } = await freshTheme();
    document.documentElement.style.setProperty("--bg0", "#123456");

    setTheme("night-a");

    expect(start).not.toHaveBeenCalled();
    expect(bg0()).toBe("#000001");
  });

  it("ignores unknown theme keys", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { setTheme, currentThemeKey } = await freshTheme();

    setTheme("no-such-theme");

    expect(warn).toHaveBeenCalledWith("Invalid theme key: no-such-theme");
    expect(currentThemeKey.value).toBe("night-a");
  });
});
