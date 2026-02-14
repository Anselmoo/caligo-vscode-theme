import type { DerivedPalette } from "../core/palette.js";
import { buildTokenGroups, formatOklch, getPrefix } from "./shared.js";
import type { ExportFormatter } from "./types.js";

export const cssOklchFormatter: ExportFormatter = {
  format: "css-oklch",
  label: "CSS Custom Properties (OKLCH)",
  extension: "css",
  mimeType: "text/css",
  generate(palette: DerivedPalette, options) {
    const prefix = getPrefix(options);
    const groups = buildTokenGroups(palette);
    const lines = [":root {"];

    for (const [groupName, group] of Object.entries(groups)) {
      lines.push(`  /* ${groupName} */`);
      for (const [key, value] of Object.entries(group)) {
        const oklch = value.oklch ? formatOklch(value.oklch) : value.hex;
        lines.push(`  --${prefix}-${key}: ${oklch};`);
      }
      lines.push("");
    }

    lines.push("}", "");

    return {
      format: "css-oklch",
      content: `${lines.join("\n")}\n`,
      filename: `${prefix}.oklch.css`,
      mimeType: "text/css",
    };
  },
};
