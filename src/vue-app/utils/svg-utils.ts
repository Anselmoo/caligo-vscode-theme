/**
 * SVG Visualization Utilities
 * Helper functions for OKLCH color space visualizations
 */

import type { ThemeOKLCH } from "../types/theme.js";
import { calculateContrast as calculateContrastHex, oklchToHex } from "./color-utils.js";

/**
 * Convert OKLCH to RGB for display
 */
export function oklchToRgb(oklch: ThemeOKLCH): string {
  // Use culori-backed conversion for accurate display colors.
  return oklchToHex(oklch.l, oklch.c, oklch.h);
}

/**
 * Convert hue angle to SVG circle coordinates
 */
export function hueToPoint(
  hue: number,
  radius: number,
  centerX: number,
  centerY: number
): { x: number; y: number } {
  const radians = (hue * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

/**
 * Calculate contrast ratio between two OKLCH colors
 */
export function calculateContrast(color1: ThemeOKLCH, color2: ThemeOKLCH): number {
  // Convert OKLCH → hex and compute WCAG contrast ratio.
  const hex1 = oklchToHex(color1.l, color1.c, color1.h);
  const hex2 = oklchToHex(color2.l, color2.c, color2.h);
  return calculateContrastHex(hex1, hex2);
}

/**
 * Generate SVG path for arc
 */
export function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

/**
 * Convert polar coordinates to cartesian
 */
export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Get WCAG level badge
 */
export function getWCAGLevel(contrast: number): string {
  if (contrast >= 7) return "AAA";
  if (contrast >= 4.5) return "AA";
  if (contrast >= 3) return "AA Large";
  return "Fail";
}

/**
 * Get color for WCAG level (theme-aware)
 * Returns CSS variable names that will be resolved at runtime
 */
export function getWCAGColor(level: string): string {
  switch (level) {
    case "AAA":
      return "var(--color-success)"; // Uses theme's strings/functions color
    case "AA":
    case "AA Large":
      return "var(--color-warning)"; // Uses theme's keywords color
    default:
      return "var(--color-error)"; // Uses theme's error color
  }
}
