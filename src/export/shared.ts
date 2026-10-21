import { converter, type Oklch } from "culori";
import type { ThemeIndexEntry } from "../types/theme.js";
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

/**
 * What the export layer formats: a title and the token groups, nothing else.
 * Formatters never see a palette, so they cannot re-derive colours the theme does not ship.
 */
export type ExportSource = {
  title: string;
  groups: ExportTokenGroups;
};

const toOklch = converter("oklch") as (color: unknown) => Oklch | undefined;

function oklchFromHex(hex: string): OklchLike {
  const color = toOklch(hex);
  return { l: color?.l ?? 0, c: color?.c ?? 0, h: color?.h ?? 0 };
}

/**
 * Build the export source from the colours the theme actually ships (the generated themes
 * manifest, read from the theme JSON). OKLCH comes from `entry.core` where the role is listed
 * there, otherwise it is computed from the hex.
 */
export function sourceFromTheme(entry: ThemeIndexEntry): ExportSource {
  const { colors } = entry;
  const coreOklch = new Map(entry.core.map(item => [item.key, item.oklch]));
  const token = (hex: string, coreKey?: string): ExportToken => ({
    hex,
    oklch: (coreKey ? coreOklch.get(coreKey) : undefined) ?? oklchFromHex(hex),
  });

  return {
    title: `${entry.seedLabel} (${entry.harmonyLabel})`,
    groups: {
      backgrounds: {
        "bg-base": token(colors.bg0, "bg0"),
        "bg-surface": token(colors.bg1, "bg1"),
        "bg-elevated": token(colors.bg2, "bg2"),
      },
      foregrounds: {
        "fg-primary": token(colors.fg0, "fg0"),
        "fg-secondary": token(colors.fg1, "fg1"),
        "fg-muted": token(colors.fgMuted, "fgMuted"),
      },
      syntax: {
        "syntax-keywords": token(colors.keywords, "keywords"),
        "syntax-types": token(colors.types, "types"),
        "syntax-functions": token(colors.functions, "functions"),
        "syntax-strings": token(colors.strings, "strings"),
        "syntax-decorator": token(colors.decorator, "decorator"),
      },
      semantic: {
        error: token(colors.error, "error"),
        warning: token(colors.warning, "warning"),
        success: token(colors.success, "success"),
        info: token(colors.info, "info"),
      },
      accent: {
        accent: token(colors.accent, "accent"),
      },
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
