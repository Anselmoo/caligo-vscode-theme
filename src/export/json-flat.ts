import { flattenTokenGroups, getPrefix } from "./shared.js";
import type { ExportFormatter } from "./types.js";

export const jsonFlatFormatter: ExportFormatter = {
  format: "json-flat",
  label: "JSON (Flat)",
  extension: "json",
  mimeType: "application/json",
  generate(source, options) {
    const prefix = getPrefix(options);
    const flat = flattenTokenGroups(source.groups);
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
