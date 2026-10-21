import { getPrefix } from "./shared.js";
import type { ExportFormatter } from "./types.js";

export const jsonGroupedFormatter: ExportFormatter = {
  format: "json-grouped",
  label: "JSON (Grouped)",
  extension: "json",
  mimeType: "application/json",
  generate(source, options) {
    const prefix = getPrefix(options);
    const groups = source.groups;
    const content = `${JSON.stringify(
      Object.fromEntries(
        Object.entries(groups).map(([groupName, group]) => [
          groupName,
          Object.fromEntries(Object.entries(group).map(([key, token]) => [key, token.hex])),
        ])
      ),
      null,
      2
    )}\n`;
    return {
      format: "json-grouped",
      content,
      filename: `${prefix}.grouped.json`,
      mimeType: "application/json",
    };
  },
};
