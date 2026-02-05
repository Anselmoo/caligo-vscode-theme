/**
 * Harmony Mode Type Definitions
 * Single source of truth for harmony mode types
 */

/**
 * Color harmony mode for syntax highlighting
 * @see {@link ../lib/harmony-colors.ts} for implementation details
 */
export type HarmonyMode =
  | "none"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "monochromatic";

/**
 * All available harmony modes as readonly array
 */
export const HARMONY_MODES: readonly HarmonyMode[] = [
  "none",
  "analogous",
  "triadic",
  "split-complementary",
  "monochromatic",
] as const;

/**
 * Type guard for HarmonyMode
 */
export function isValidHarmonyMode(value: unknown): value is HarmonyMode {
  return typeof value === "string" && HARMONY_MODES.includes(value as HarmonyMode);
}
