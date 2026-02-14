import type { DerivedPalette } from "../core/palette.js";
import type { ExportOptions } from "./types.js";

type OklchLike = { l: number; c: number; h: number };

export type ExportToken = {
  hex: string;
  oklch?: OklchLike;
};

export type ExportTokenGroups = {
  backgrounds: Record<string, ExportToken>;
  foregrounds: Record<string, ExportToken>;
  syntax: Record<string, ExportToken>;
  semantic: Record<string, ExportToken>;
  accent: Record<string, ExportToken>;
};

export function getPrefix(options?: ExportOptions): string {
  return options?.prefix?.trim() || "caligo";
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map(ch => `${ch}${ch}`)
          .join("")
      : clean;
  const rgbInt = Number.parseInt(normalized, 16);
  return [(rgbInt >> 16) & 255, (rgbInt >> 8) & 255, rgbInt & 255];
}

export function toSrgbComponents(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [r / 255, g / 255, b / 255];
}

export function buildTokenGroups(palette: DerivedPalette): ExportTokenGroups {
  return {
    backgrounds: {
      "bg-base": { hex: palette.bg0, oklch: palette.debug.oklch.bg0 },
      "bg-surface": { hex: palette.bg1, oklch: palette.debug.oklch.bg1 },
      "bg-elevated": { hex: palette.bg2, oklch: palette.debug.oklch.bg2 },
    },
    foregrounds: {
      "fg-primary": { hex: palette.fg0, oklch: palette.debug.oklch.fg0 },
      "fg-secondary": { hex: palette.fg1, oklch: palette.debug.oklch.fg1 },
      "fg-muted": { hex: palette.fgMuted, oklch: palette.debug.oklch.fgMuted },
    },
    syntax: {
      "syntax-keywords": { hex: palette.hueOrange, oklch: palette.debug.oklch.hueOrange },
      "syntax-types": { hex: palette.hueBlue, oklch: palette.debug.oklch.hueBlue },
      "syntax-functions": { hex: palette.hueGreen, oklch: palette.debug.oklch.hueGreen },
      "syntax-strings": { hex: palette.hueCyan, oklch: palette.debug.oklch.hueCyan },
      "syntax-decorator": { hex: palette.huePurple, oklch: palette.debug.oklch.huePurple },
    },
    semantic: {
      error: { hex: palette.semantic.error, oklch: palette.semantic.debug.error },
      warning: { hex: palette.semantic.warning, oklch: palette.semantic.debug.warning },
      success: { hex: palette.semantic.success, oklch: palette.semantic.debug.success },
      info: { hex: palette.semantic.info, oklch: palette.semantic.debug.info },
    },
    accent: {
      accent: { hex: palette.accent, oklch: palette.debug.oklch.accent },
    },
  };
}

export function flattenTokenGroups(groups: ExportTokenGroups): Record<string, ExportToken> {
  return {
    ...groups.backgrounds,
    ...groups.foregrounds,
    ...groups.syntax,
    ...groups.semantic,
    ...groups.accent,
  };
}

export function formatOklch(value: OklchLike): string {
  return `oklch(${value.l.toFixed(3)} ${value.c.toFixed(3)} ${value.h.toFixed(1)})`;
}
