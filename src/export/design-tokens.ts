import type { DerivedPalette } from "../core/palette.js";
import { buildTokenGroups, getPrefix, toSrgbComponents } from "./shared.js";
import type { ExportFormatter } from "./types.js";

function toTokenValue(hex: string) {
  const components = toSrgbComponents(hex);
  return {
    colorSpace: "srgb",
    channels: components.map(component => Number(component.toFixed(3))),
  };
}

export const designTokensFormatter: ExportFormatter = {
  format: "design-tokens-w3c",
  label: "W3C Design Tokens",
  extension: "json",
  mimeType: "application/json",
  generate(palette: DerivedPalette, options) {
    const prefix = getPrefix(options);
    const groups = buildTokenGroups(palette);
    const tokens = {
      [prefix]: {
        $description: `Caligo — ${palette.seed.displayName} (${palette.mode}) palette`,
        background: {
          $type: "color",
          ...Object.fromEntries(
            Object.entries(groups.backgrounds).map(([key, token]) => [
              key.replace("bg-", ""),
              { $value: toTokenValue(token.hex) },
            ])
          ),
        },
        foreground: {
          $type: "color",
          ...Object.fromEntries(
            Object.entries(groups.foregrounds).map(([key, token]) => [
              key.replace("fg-", ""),
              { $value: toTokenValue(token.hex) },
            ])
          ),
        },
        syntax: {
          $type: "color",
          ...Object.fromEntries(
            Object.entries(groups.syntax).map(([key, token]) => [
              key.replace("syntax-", ""),
              { $value: toTokenValue(token.hex) },
            ])
          ),
        },
        semantic: {
          $type: "color",
          ...Object.fromEntries(
            Object.entries(groups.semantic).map(([key, token]) => [
              key,
              { $value: toTokenValue(token.hex) },
            ])
          ),
        },
        accent: {
          $type: "color",
          $value: toTokenValue(groups.accent.accent.hex),
        },
      },
    };

    return {
      format: "design-tokens-w3c",
      content: `${JSON.stringify(tokens, null, 2)}\n`,
      filename: `${prefix}.tokens.json`,
      mimeType: "application/json",
    };
  },
};
