import { converter } from "culori";
import { apcaLc as compositedApcaLc } from "./contrast.js";

export type SemanticColorValue = string | { foreground?: string; fontStyle?: string };

type OklchLike = {
  l: number;
  c: number;
  h?: number;
};

const toOklch = converter("oklch");

/** Trim and lowercase. The alpha byte of `#RRGGBBAA` is preserved, never stripped. */
export function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase();
}

export function isHexColor(v: string): boolean {
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(v.trim().toLowerCase());
}

/**
 * The foreground as a normalized hex string. A `#RRGGBBAA` value keeps its alpha byte so the
 * scorers in contrast.ts can composite it over the background it is measured against.
 */
export function extractForeground(value: SemanticColorValue | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return isHexColor(value) ? normalizeHex(value) : undefined;
  }
  if (typeof value.foreground === "string" && isHexColor(value.foreground)) {
    return normalizeHex(value.foreground);
  }
  return undefined;
}

export function hexToRgb(hex: string): [number, number, number] {
  // RGB channels only: the alpha byte (if any) is deliberately ignored here.
  const clean = normalizeHex(hex).replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

/**
 * Absolute APCA Lc of `foregroundHex` on `backgroundHex`. Delegates to the single implementation
 * in contrast.ts, so `#RRGGBBAA` colors are alpha-composited (not stripped) before scoring and
 * malformed input throws.
 */
export function apcaLc(foregroundHex: string, backgroundHex: string): number {
  return compositedApcaLc(foregroundHex, backgroundHex);
}

export function deltaEOklch(hex1: string, hex2: string): number {
  const c1 = toOklch(hex1) as OklchLike | undefined;
  const c2 = toOklch(hex2) as OklchLike | undefined;

  if (!c1 || !c2) return 0;
  if (
    !Number.isFinite(c1.l) ||
    !Number.isFinite(c1.c) ||
    !Number.isFinite(c2.l) ||
    !Number.isFinite(c2.c) ||
    c1.h === undefined ||
    c2.h === undefined
  ) {
    return 0;
  }

  const dl = c1.l - c2.l;
  const dc = c1.c - c2.c;
  const h1Rad = (c1.h * Math.PI) / 180;
  const h2Rad = (c2.h * Math.PI) / 180;
  const dh = 2 * Math.sqrt(c1.c * c2.c) * Math.sin((h1Rad - h2Rad) / 2);
  return Math.sqrt(dl * dl + dc * dc + dh * dh);
}
