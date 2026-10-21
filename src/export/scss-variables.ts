import { flattenTokenGroups, getPrefix } from "./shared.js";
import type { ExportFormatter } from "./types.js";

export const scssVariablesFormatter: ExportFormatter = {
  format: "scss-variables",
  label: "SCSS Variables",
  extension: "scss",
  mimeType: "text/x-scss",
  generate(source, options) {
    const prefix = getPrefix(options);
    const flat = flattenTokenGroups(source.groups);
    const content = `${Object.entries(flat)
      .map(([key, token]) => `$${prefix}-${key}: ${token.hex};`)
      .join("\n")}\n`;

    return {
      format: "scss-variables",
      content,
      filename: `${prefix}.scss`,
      mimeType: "text/x-scss",
    };
  },
};
