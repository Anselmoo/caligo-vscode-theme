import { describe, expect, it, vi } from "vitest";
import { useExport } from "../useExport";

vi.mock("../useTheme", () => ({
  useTheme: () => ({
    currentTheme: {
      value: {
        seedId: "DeepSable",
        seedLabel: "Deep Sable",
        harmonyId: "balanced",
        oklch: {
          bg: { l: 0.1, c: 0.02, h: 250 },
          accent: { l: 0.65, c: 0.15, h: 250 },
          fg: { l: 0.86, c: 0.03, h: 250 },
        },
      },
    },
  }),
}));

describe("useExport", () => {
  it("keeps export output behavior stable with default format", () => {
    const { selectedFormat, currentResult } = useExport();

    expect(selectedFormat.value).toBe("css-custom-properties");
    expect(currentResult.value?.content).toContain("--caligo-bg-base:");
    expect(currentResult.value?.content).toContain("--caligo-syntax-keywords:");
  });
});
