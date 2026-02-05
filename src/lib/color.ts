import { clampRgb, converter, formatHex, formatHex8 } from "culori";

export type OkLch = {
  mode: "oklch";
  l: number;
  c: number;
  h: number;
  alpha?: number;
};

const toRgb = converter("rgb");

export function oklch(l: number, c: number, h: number, alpha = 1): OkLch {
  return { mode: "oklch", l, c, h, alpha };
}

export function toHex(color: OkLch): string {
  const rgb = clampRgb(toRgb(color));

  // culori exports both `formatHex` and `formatHex8` in modern versions.
  // Prefer hex8 when alpha is present.
  const a = typeof color.alpha === "number" ? color.alpha : 1;
  if (a < 1 && typeof formatHex8 === "function") {
    return formatHex8(rgb);
  }

  return formatHex(rgb);
}

export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(normalized)) {
    throw new Error(`withAlpha: expected #RRGGBB or #RRGGBBAA, got '${hex}'`);
  }

  const rgb = normalized.slice(0, 7);
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0");

  return `${rgb}${aa}`;
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
