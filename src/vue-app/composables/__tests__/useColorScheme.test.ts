import { beforeEach, describe, expect, it, vi } from "vitest";
import { useColorScheme } from "../useColorScheme";

// Mock useTheme and useColors
vi.mock("../useTheme", () => ({
  useTheme: () => ({
    currentTheme: {
      value: {
        colors: {
          bg0: "#0b0c10",
          bg1: "#1a1d23",
          bg2: "#2a2d33",
          fg0: "#e6e6e6",
          fg1: "#b3b3b3",
          fgMuted: "#808080",
          accent: "#5eb3f6",
          error: "#ff5555",
          keywords: "#ff9500",
          types: "#55ff55",
          functions: "#55aaff",
          strings: "#ffaa00",
          decorator: "#ff5555",
        },
      },
    },
  }),
}));

vi.mock("../useColors", () => ({
  useColors: () => ({
    backgrounds: { value: {} },
    foregrounds: { value: {} },
    accents: { value: {} },
  }),
}));

beforeEach(() => {
  const mockStyle = {
    getPropertyValue: (name: string) => {
      const mockVars: Record<string, string> = {
        // Backgrounds
        "--bg0": "#0b0c10",
        "--bg1": "#1a1d23",
        "--bg2": "#2a2d33",
        // Foregrounds
        "--fg0": "#e6e6e6",
        "--fg1": "#b3b3b3",
        "--fg-muted": "#9ca3af",
        // Accent / semantic
        "--accent": "#5eb3f6",
        "--error": "#ff5555",
        // Text & surface
        "--text-primary": "#e6e6e6",
        "--text-secondary": "#b3b3b3",
        "--text-muted": "#9ca3af",
        "--surface-base": "#0b0c10",
        // App derived tokens
        "--app-text-primary": "#e6e6e6",
        "--app-text-strong": "#ffffff",
        "--app-text-muted": "#9ca3af",
        "--app-text-subtle": "#808080",
        // Borders
        "--border-primary": "rgba(125,211,252,0.3)",
        "--border-secondary": "rgba(125,211,252,0.15)",
        "--border-color": "rgba(125,211,252,0.2)",
      };
      return mockVars[name] || "";
    },
  };
  vi.spyOn(window, "getComputedStyle").mockReturnValue(mockStyle as unknown as CSSStyleDeclaration);
});

describe("useColorScheme", () => {
  it("should expose all color tokens", () => {
    const { tokens } = useColorScheme();

    expect(tokens.value).toBeDefined();
    expect(tokens.value.bg0).toBeDefined();
    expect(tokens.value.fg0).toBeDefined();
    expect(tokens.value.accent).toBeDefined();
  });

  it("should provide color values from theme", () => {
    const { tokens } = useColorScheme();

    expect(tokens.value.bg0.value).toBe("#0b0c10");
    expect(tokens.value.accent.value).toBe("#5eb3f6");
  });

  it("should provide CSS variable names", () => {
    const { tokens } = useColorScheme();

    expect(tokens.value.bg0.cssVar).toBe("--bg0");
    expect(tokens.value.accent.cssVar).toBe("--accent");
  });

  it("should provide RGB components", () => {
    const { tokens } = useColorScheme();

    expect(tokens.value.bg0.rgb).toMatch(/^\d+, \d+, \d+$/);
  });

  it("should provide getToken utility", () => {
    const { getToken } = useColorScheme();

    const accentToken = getToken("accent");
    expect(accentToken.value).toBe("#5eb3f6");
  });

  it("should provide getColor utility", () => {
    const { getColor } = useColorScheme();

    const accentColor = getColor("accent");
    expect(accentColor).toBe("#5eb3f6");
  });

  it("should provide getRgb utility", () => {
    const { getRgb } = useColorScheme();

    const accentRgb = getRgb("accent");
    expect(accentRgb).toMatch(/^\d+, \d+, \d+$/);
  });
});
