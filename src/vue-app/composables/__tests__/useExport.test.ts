import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ThemeIndexEntry } from "../../../types/theme.js";

const currentTheme = vi.hoisted(() => ({
  value: null as ThemeIndexEntry | null,
}));

vi.mock("../useTheme", () => ({
  useTheme: () => ({
    currentTheme,
  }),
}));

import { useExport } from "../useExport";

function makeTheme(overrides: Partial<ThemeIndexEntry> = {}): ThemeIndexEntry {
  return {
    key: "Caligo-DeepSable",
    seedId: "DeepSable",
    seedSlug: "deepsable",
    seedLabel: "Deep Sable",
    harmonyId: "balanced",
    harmonyLabel: "Balanced",
    displayName: "Deep Sable",
    vscodeLabel: "Caligo (Deep Sable — Balanced)",
    colors: {
      bg0: "#0f0e17",
      bg1: "#14131d",
      bg2: "#1a1925",
      fg0: "#e6e4f0",
      fg1: "#c9c7d6",
      fgMuted: "#8a889a",
      accent: "#3b9cf6",
      error: "#ff9687",
      warning: "#e2aa00",
      success: "#00ce39",
      info: "#73dfff",
      strings: "#ffc8cf",
      types: "#ce8545",
      functions: "#d1d473",
      keywords: "#71fff7",
      decorator: "#b79cff",
    },
    core: [],
    oklch: {
      accent: { l: 0.65, c: 0.15, h: 250 },
      bg: { l: 0.1, c: 0.02, h: 290 },
      fg: { l: 0.9, c: 0.02, h: 290 },
    },
    ...overrides,
  };
}

describe("useExport", () => {
  beforeEach(() => {
    currentTheme.value = makeTheme();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exposes available formats and human-readable labels", () => {
    const { selectedFormat, availableFormats, formatLabels } = useExport();

    expect(selectedFormat.value).toBe("css-custom-properties");
    expect(availableFormats.value).toContain("design-tokens-w3c");
    expect(formatLabels.value["design-tokens-w3c"]).toBe("W3C Design Tokens");
  });

  it("returns null result when no theme is available", () => {
    currentTheme.value = null;
    const { currentResult } = useExport();

    expect(currentResult.value).toBeNull();
  });

  it("exports the shipped colours of the current theme, whatever its harmony", () => {
    currentTheme.value = makeTheme({
      harmonyId: "triadic",
      harmonyLabel: "Triadic",
      colors: { ...makeTheme().colors, keywords: "#abcdef" },
    });

    const { currentResult } = useExport();
    expect(currentResult.value?.content).toContain("--caligo-bg-base: #0f0e17;");
    expect(currentResult.value?.content).toContain("--caligo-syntax-keywords: #abcdef;");
    expect(currentResult.value?.content).toContain("Caligo — Deep Sable (Triadic)");
  });

  it("copies current content successfully", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const { copyCurrent } = useExport();
    await expect(copyCurrent()).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("--caligo-bg-base:"));
  });

  it("returns false when clipboard copy fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const { copyCurrent } = useExport();
    await expect(copyCurrent()).resolves.toBe(false);
  });

  it("downloads the current result", () => {
    const click = vi.fn();
    const createObjectURL = vi.fn().mockReturnValue("blob:preview");
    const revokeObjectURL = vi.fn();
    const createElement = vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click,
    } as unknown as HTMLAnchorElement);

    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    const { downloadCurrent } = useExport();
    downloadCurrent();

    expect(createElement).toHaveBeenCalledWith("a");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });
});
