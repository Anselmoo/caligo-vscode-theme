import type { DerivedPalette } from "../core/palette.js";
import { buildTokenGroups, getPrefix } from "./shared.js";
import type { ExportFormatter } from "./types.js";

export const cssCustomPropertiesFormatter: ExportFormatter = {
  format: "css-custom-properties",
  label: "CSS Custom Properties",
  extension: "css",
  mimeType: "text/css",
  generate(palette: DerivedPalette, options) {
    const prefix = getPrefix(options);
    const groups = buildTokenGroups(palette);
    const groupLines = Object.entries(groups).flatMap(([groupName, group]) => [
      `  /* ${groupName} */`,
      ...Object.entries(group).map(([key, value]) => `  --${prefix}-${key}: ${value.hex};`),
      "",
    ]);
    const lines = [
      `/* Caligo — ${palette.seed.displayName} (${palette.mode}) */`,
      ":root {",
      ...groupLines,
      "}",
      "",
    ];

    return {
      format: "css-custom-properties",
      content: `${lines.join("\n")}\n`,
      filename: `${prefix}.css`,
      mimeType: "text/css",
    };
  },
};
