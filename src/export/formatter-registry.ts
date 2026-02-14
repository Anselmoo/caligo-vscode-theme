import { cssCustomPropertiesFormatter } from "./css-custom-properties.js";
import { cssOklchFormatter } from "./css-oklch.js";
import { designTokensFormatter } from "./design-tokens.js";
import { jsonFlatFormatter } from "./json-flat.js";
import { jsonGroupedFormatter } from "./json-grouped.js";
import { scssVariablesFormatter } from "./scss-variables.js";
import { tailwindConfigFormatter } from "./tailwind-config.js";
import type { ExportFormat, ExportFormatter } from "./types.js";

export const EXPORT_FORMATTERS: ExportFormatter[] = [
  cssCustomPropertiesFormatter,
  cssOklchFormatter,
  scssVariablesFormatter,
  designTokensFormatter,
  tailwindConfigFormatter,
  jsonFlatFormatter,
  jsonGroupedFormatter,
];

export function getFormatter(format: ExportFormat): ExportFormatter {
  const formatter = EXPORT_FORMATTERS.find(item => item.format === format);
  if (!formatter) {
    throw new Error(`Unsupported export format: ${format}`);
  }
  return formatter;
}
