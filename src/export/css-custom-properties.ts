import { getPrefix } from "./shared.js";
import type { ExportFormatter } from "./types.js";

export const cssCustomPropertiesFormatter: ExportFormatter = {
  format: "css-custom-properties",
  label: "CSS Custom Properties",
  extension: "css",
  mimeType: "text/css",
  generate(source, options) {
    const prefix = getPrefix(options);
    const groups = source.groups;
    const groupLines = Object.entries(groups).flatMap(([groupName, group]) => [
      `  /* ${groupName} */`,
      ...Object.entries(group).map(([key, value]) => `  --${prefix}-${key}: ${value.hex};`),
      "",
    ]);
    const lines = [`/* Caligo — ${source.title} */`, ":root {", ...groupLines, "}", ""];

    return {
      format: "css-custom-properties",
      content: `${lines.join("\n")}\n`,
      filename: `${prefix}.css`,
      mimeType: "text/css",
    };
  },
};
