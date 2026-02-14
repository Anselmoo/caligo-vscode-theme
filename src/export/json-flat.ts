import type { DerivedPalette } from "../core/palette.js";
import { buildTokenGroups, flattenTokenGroups, getPrefix } from "./shared.js";
import type { ExportFormatter } from "./types.js";

export const jsonFlatFormatter: ExportFormatter = {
  format: "json-flat",
  label: "JSON (Flat)",
  extension: "json",
  mimeType: "application/json",
  generate(palette: DerivedPalette, options) {
    const prefix = getPrefix(options);
    const flat = flattenTokenGroups(buildTokenGroups(palette));
    const content = `${JSON.stringify(
      Object.fromEntries(Object.entries(flat).map(([key, token]) => [key, token.hex])),
      null,
      2
    )}\n`;
    return {
      format: "json-flat",
      content,
      filename: `${prefix}.json`,
      mimeType: "application/json",
    };
  },
};
