import { APCAcontrast, sRGBtoY } from "apca-w3";
// Import utility functions from main culori - these don't require mode registration
import { differenceEuclidean, displayable } from "culori";
// Import converters directly from culori/all to ensure these color modes are bundled
// The default culori import uses converter() with dynamic strings which get tree-shaken
// See: https://github.com/evercoder/culori/blob/main/docs/guides/tree-shaking.md
// @ts-expect-error - culori/all has no type declarations but exports converters at runtime
import { oklch, p3, rgb } from "culori/all";
import { computed } from "vue";
import { useTheme } from "./useTheme.js";

export interface OKLCHColor {
  key: string;
  label?: string;
  hex: string;
  l: number;
  c: number;
  h: number;
  semanticRole: string;
  inSRGB: boolean;
  inP3: boolean;
}

export function useThemeAnalysis() {
  const { currentTheme } = useTheme();

  // Color converters - directly imported functions (not converter("mode") which gets tree-shaken)
  const toOKLCH = oklch;
  const toRGB = rgb;
  const toP3 = p3;

  type CuloriOklchLike = { l?: number; c?: number; h?: number };
  type CuloriRgbLike = { r?: number; g?: number; b?: number };

  function isInUnitRgbChannels(color: unknown): boolean {
    if (!color || typeof color !== "object") return false;
    const c = color as { r?: number; g?: number; b?: number };
    return (
      typeof c.r === "number" &&
      c.r >= 0 &&
      c.r <= 1 &&
      typeof c.g === "number" &&
      c.g >= 0 &&
      c.g <= 1 &&
      typeof c.b === "number" &&
      c.b >= 0 &&
      c.b <= 1
    );
  }

  /**
   * Convert all theme colors to OKLCH with metadata
   */
  const oklchColors = computed((): OKLCHColor[] => {
    const theme = currentTheme.value;
    if (!theme) {
      return [];
    }

    // Prefer precomputed core colors from the manifest (stable keys), but ALWAYS compute OKLCH from hex
    // to ensure accuracy, since manifest OKLCH values may be stale or template placeholders.
    if (Array.isArray(theme.core) && theme.core.length > 0) {
      return theme.core.map(item => {
        const hex = item.hex;
        // Always compute OKLCH from hex instead of trusting manifest values
        const oklch = toOKLCH(hex);
        const o = (oklch ?? {}) as CuloriOklchLike;
        return {
          key: item.key,
          label: item.label,
          hex,
          l: o.l ?? 0,
          c: o.c ?? 0,
          h: o.h ?? 0,
          semanticRole: getSemanticRole(item.key, hex),
          inSRGB: displayable(hex) ?? false,
          inP3: isInUnitRgbChannels(toP3(hex)),
        };
      });
    }

    // Fallback: derive from theme.colors if core is not present.
    const colorMap = theme.colors as unknown as Record<string, string>;
    const entries = Object.entries(colorMap);
    return entries.map(([key, hex]) => {
      const oklch = toOKLCH(hex);
      const o = (oklch ?? {}) as CuloriOklchLike;
      return {
        key,
        hex,
        l: o.l ?? 0,
        c: o.c ?? 0,
        h: o.h ?? 0,
        semanticRole: getSemanticRole(key, hex),
        inSRGB: displayable(hex) ?? false,
        inP3: isInUnitRgbChannels(toP3(hex)),
      };
    });
  });

  /**
   * Extract harmony mode from selected harmony
   */
  const harmonyMode = computed(() => {
    const theme = currentTheme.value;
    return theme?.harmonyLabel ?? "";
  });

  /**
   * Calculate deltaE (perceptual color difference in OKLCH)
   */
  function deltaE(color1: unknown, color2: unknown): number {
    const deltaEFn = differenceEuclidean("oklch");
    // differenceEuclidean expects culori-compatible color objects; callers pass through culori outputs.
    return deltaEFn(color1 as never, color2 as never) ?? 0;
  }

  /**
   * Calculate APCA contrast (WCAG 3.0)
   * Returns Lc value (can be negative based on polarity)
   */
  function getAPCAContrast(fgHex: string, bgHex: string): number {
    const fg = toRGB(fgHex);
    const bg = toRGB(bgHex);

    const fgRgb = (fg ?? {}) as CuloriRgbLike;
    const bgRgb = (bg ?? {}) as CuloriRgbLike;

    // Convert to sRGB arrays [0-255]
    const bgY = sRGBtoY([(bgRgb.r ?? 0) * 255, (bgRgb.g ?? 0) * 255, (bgRgb.b ?? 0) * 255]);
    const fgY = sRGBtoY([(fgRgb.r ?? 0) * 255, (fgRgb.g ?? 0) * 255, (fgRgb.b ?? 0) * 255]);

    return APCAcontrast(fgY, bgY);
  }

  /**
   * Determine semantic role of a color from theme schema
   * TODO: Implement mapping from theme schema once structure is known
   */
  function getSemanticRole(key: string, _hex: string): string {
    // Deterministic mapping for the preview palette schema (themeStore.generateColorPalette).
    // This yields stable categories used by the analysis UI.
    if (key.startsWith("bg")) return "Background";
    if (key.startsWith("fg")) return "Foreground";
    if (key === "accent" || key === "accentAlt") return "Accent";
    if (key === "error") return "Accent";
    if (["keywords", "types", "functions", "strings", "decorator"].includes(key)) return "Syntax";
    if (["declaration", "mutation", "usage", "control", "data", "literal"].includes(key))
      return "Syntax";

    // Fallback (keeps behavior sane if new keys are introduced)
    const oklch = toOKLCH(_hex);
    const o = (oklch ?? {}) as CuloriOklchLike;
    const lightness = o.l ?? 0;

    if (lightness < 0.2) return "Background";
    if (lightness > 0.8) return "Foreground";
    return "Accent";
  }

  return {
    oklchColors,
    harmonyMode,
    deltaE,
    getAPCAContrast,
    getSemanticRole,
  };
}
