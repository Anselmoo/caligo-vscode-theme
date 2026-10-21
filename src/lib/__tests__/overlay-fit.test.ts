import { converter } from "culori";
import { describe, expect, it } from "vitest";
import { scaleAlpha } from "../color.js";
import { wcagContrastRatio } from "../contrast.js";
import { evaluateThemeContrast } from "../contrast-pairs.js";
import { fitOverlaysToReaders } from "../overlay-fit.js";
import { derivePalette } from "../palette.js";
import { loadAllSeeds } from "../seeds.js";
import { buildVscodeThemeJson } from "../vscode-theme.js";

const toOklch = converter("oklch") as (c: string) => { l: number; c?: number; h?: number };

describe("scaleAlpha", () => {
  it("multiplies the existing alpha instead of replacing it", () => {
    expect(scaleAlpha("#12c28147", 0.6)).toBe("#12c2812b"); // 0x47 * 0.6 = 42.6 -> 0x2b
    expect(scaleAlpha("#12c281", 0.5)).toBe("#12c28180");
  });
});

describe("fitOverlaysToReaders", () => {
  // Cinder-like sidebar with a bright accent selection that drops fg below 4.5:1.
  const colors = {
    "sideBar.background": "#001a1f",
    "panel.background": "#001a1f",
    "list.activeSelectionBackground": "#63b18959",
    "list.activeSelectionForeground": "#d6e2e0",
    descriptionForeground: "#81979b",
  };

  it("keeps alpha and hue and lifts a failing reader over the floor", () => {
    const base = ["#001a1f"];
    const before = colors["list.activeSelectionBackground"];
    expect(wcagContrastRatio("#81979b", before, base)).toBeLessThan(4.5);

    const fitted = fitOverlaysToReaders(colors)["list.activeSelectionBackground"];
    expect(fitted.slice(7)).toBe(before.slice(7));
    expect(Math.abs((toOklch(fitted).h ?? 0) - (toOklch(before).h ?? 0))).toBeLessThan(3);
    expect(toOklch(fitted).l).toBeLessThan(toOklch(before).l);
    // Either the reader now passes, or the overlay stopped at its visibility budget.
    const ratio = wcagContrastRatio("#81979b", fitted, base);
    expect(ratio).toBeGreaterThan(wcagContrastRatio("#81979b", before, base));
  });

  it("leaves an overlay alone when every reader already passes", () => {
    const calm = { ...colors, "list.activeSelectionBackground": "#63b18910" };
    expect(fitOverlaysToReaders(calm)["list.activeSelectionBackground"]).toBe("#63b18910");
  });

  it("on built themes, a second pass only moves overlays that stopped at their budget", async () => {
    for (const seed of (await loadAllSeeds()).slice(0, 3)) {
      const theme = buildVscodeThemeJson(derivePalette(seed, "Balanced"));
      const again = fitOverlaysToReaders(theme.colors);
      const stillFailingOn = new Set(
        evaluateThemeContrast(theme)
          .filter(r => !r.pass)
          .map(r => r.id.split("|")[1].split(">").at(-1))
      );
      for (const key of Object.keys(theme.colors)) {
        if (again[key] !== theme.colors[key]) expect(stillFailingOn.has(key), key).toBe(true);
      }
    }
  });
});
