import type { DerivedPalette } from "../core/palette.js";

export type ExportFormat =
  | "css-custom-properties"
  | "css-oklch"
  | "scss-variables"
  | "design-tokens-w3c"
  | "tailwind-config"
  | "json-flat"
  | "json-grouped";

export interface ExportOptions {
  prefix?: string;
  includeRgb?: boolean;
  includeOklchComments?: boolean;
  groupBy?: "role" | "flat";
}

export interface ExportResult {
  format: ExportFormat;
  content: string;
  filename: string;
  mimeType: string;
}

export interface ExportFormatter {
  format: ExportFormat;
  label: string;
  extension: string;
  mimeType: string;
  generate(palette: DerivedPalette, options?: ExportOptions): ExportResult;
}
