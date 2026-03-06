type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  const h = hex.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(h)) {
    throw new Error(`hexToRgb: expected #RRGGBB or #RRGGBBAA, got '${hex}'`);
  }

  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);

  return { r, g, b };
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: RGB): number {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function wcagContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const fg = relativeLuminance(hexToRgb(foregroundHex));
  const bg = relativeLuminance(hexToRgb(backgroundHex));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns whichever of `primaryCandidateHex` or `fallbackHex` produces a higher WCAG contrast
 * ratio against `bgHex`.
 *
 * Accepts hex colors in `#RRGGBB` or `#RRGGBBAA` form. If an alpha channel is
 * provided, it is ignored (no compositing is performed; colors are treated
 * as fully opaque).
 */
export function pickReadableForeground(
  bgHex: string,
  primaryCandidateHex: string,
  fallbackHex: string
): string {
  const primaryContrast = wcagContrastRatio(primaryCandidateHex, bgHex);
  const fallbackContrast = wcagContrastRatio(fallbackHex, bgHex);
  return primaryContrast >= fallbackContrast ? primaryCandidateHex : fallbackHex;
}
