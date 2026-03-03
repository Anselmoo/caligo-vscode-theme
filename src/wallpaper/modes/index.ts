/**
 * Mode composers index.
 * Maps HarmonyMode keys to their mode composer functions.
 */
import type { ModeComposerFn } from "../types.js";
import { analogousMode } from "./analogous.js";
import { balancedMode } from "./balanced.js";
import { monochromaticMode } from "./monochromatic.js";
import { splitComplementaryMode } from "./split-complementary.js";
import { triadicMode } from "./triadic.js";

export const MODE_COMPOSERS: Record<string, ModeComposerFn> = {
  none: balancedMode,
  analogous: analogousMode,
  "split-complementary": splitComplementaryMode,
  monochromatic: monochromaticMode,
  triadic: triadicMode,
};

export { analogousMode, balancedMode, monochromaticMode, splitComplementaryMode, triadicMode };
