import type { DerivedPalette } from "../core/palette.js";
import { buildTokenGroups, getPrefix } from "./shared.js";
import type { ExportFormatter } from "./types.js";

export const tailwindConfigFormatter: ExportFormatter = {
  format: "tailwind-config",
  label: "Tailwind Config",
  extension: "ts",
  mimeType: "text/typescript",
  generate(palette: DerivedPalette, options) {
    const prefix = getPrefix(options);
    const groups = buildTokenGroups(palette);
    const colors = Object.fromEntries(
      Object.entries(groups).map(([groupName, group]) => [
        groupName,
        Object.fromEntries(Object.entries(group).map(([key, token]) => [key, token.hex])),
      ])
    );
    const content = `export default {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(colors, null, 8)},\n    },\n  },\n};\n`;

    return {
      format: "tailwind-config",
      content,
      filename: `${prefix}.tailwind.config.ts`,
      mimeType: "text/typescript",
    };
  },
};
