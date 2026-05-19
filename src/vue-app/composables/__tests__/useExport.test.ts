import { beforeEach, describe, expect, it, vi } from "vitest";
import * as corePalette from "../../../core/palette.js";

type MockTheme = {
  seedId: string;
  seedLabel: string;
  harmonyId: string;
  oklch: {
    bg: { l: number; c: number; h: number };
    accent: { l: number; c: number; h: number };
  };
};

const currentTheme = vi.hoisted(() => ({
  value: null as MockTheme | null,
}));

vi.mock("../useTheme", () => ({
  useTheme: () => ({
    currentTheme,
  }),
}));

import { useExport } from "../useExport";

describe("useExport", () => {
  const THEME_MODE = "Balanced";

  beforeEach(() => {
    currentTheme.value = {
      seedId: "Signal",
      seedLabel: "Deep Sable",
      harmonyId: "balanced",
      oklch: {
        bg: { l: 0.1, c: 0.02, h: 250 },
        accent: { l: 0.65, c: 0.15, h: 250 },
      },
    };
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

  it.each([
    ["balanced", "none"],
    ["analogous", "analogous"],
    ["monochromatic", "monochromatic"],
    ["triadic", "triadic"],
    ["split-complementary", "split-complementary"],
    ["unknown", "none"],
  ])("maps harmony '%s' to '%s'", (harmonyId, expectedHarmony) => {
    const deriveSpy = vi.spyOn(corePalette, "derivePalette");
    currentTheme.value = {
      seedId: "Signal",
      seedLabel: "Deep Sable",
      harmonyId,
      oklch: {
        bg: { l: 0.1, c: 0.02, h: 250 },
        accent: { l: 0.65, c: 0.15, h: 250 },
      },
    };

    const { currentResult } = useExport();
    expect(currentResult.value?.content).toContain("--caligo-bg-base:");
    expect(deriveSpy).toHaveBeenCalledWith(
      expect.objectContaining({ harmony: expectedHarmony }),
      THEME_MODE
    );
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
