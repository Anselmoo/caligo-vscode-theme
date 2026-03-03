/**
 * Shared SVG numeric formatting policy for wallpaper rendering.
 * Centralizing precision here keeps output quality tuning consistent.
 */

const trimTrailingZeros = (value: string): string => value.replace(/(?:\.0+|(\.\d*?)0+)$/, "$1");

function fmt(value: number, precision: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = value.toFixed(precision);
  return trimTrailingZeros(rounded);
}

export function fmtCoord(value: number): string {
  return fmt(value, 2);
}

export function fmtLength(value: number): string {
  return fmt(value, 2);
}

export function fmtStroke(value: number): string {
  return fmt(value, 2);
}

export function fmtOpacity(value: number): string {
  return fmt(value, 3);
}

export function fmtPercent(value: number): string {
  return fmt(value, 2);
}
