/**
 * Pure helpers for the thumbnail generator script.
 *
 * Kept out of scripts/generate-wallpaper-thumbs.ts so they can be unit-tested
 * without importing a module whose top level launches a browser.
 */

import type { Platform } from "./types.js";
import { PLATFORMS } from "./types.js";

/** Default WebP encoding quality, matching canvas.toDataURL's third argument. */
export const DEFAULT_THUMBNAIL_QUALITY = 0.8;

/**
 * Parse a --quality flag value.
 *
 * Validates eagerly because canvas.toDataURL silently *ignores* a quality
 * outside [0, 1] (or NaN) and falls back to its own default — so a typo would
 * quietly re-encode all 300 thumbnails at a different size with no error.
 */
export function parseQuality(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_THUMBNAIL_QUALITY;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid --quality "${raw}": expected a number between 0 and 1.`);
  }
  return value;
}

/** Last path segment, treating both POSIX and Windows separators as separators. */
function basename(path: string): string {
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return path.slice(cut + 1);
}

/**
 * The platform a wallpaper file belongs to, from its basename
 * ("monitor.svg" / "mobile-text.svg" → "monitor" / "mobile").
 *
 * Throws rather than defaulting: an unrecognised name means the generator would
 * otherwise silently rasterise at the wrong aspect ratio.
 */
export function platformFromPath(svgPath: string): Platform {
  const name = basename(svgPath)
    .replace(/\.svg$/, "")
    .replace(/-text$/, "");

  const platform = PLATFORMS.find(p => p === name);
  if (!platform) {
    throw new Error(`Unrecognised wallpaper platform in "${svgPath}"`);
  }
  return platform;
}

/**
 * Whether a wallpaper path sits under the given seed directory.
 *
 * Compares whole path segments on either separator, so `--seed=Eclipse` neither
 * misses Windows paths produced by path.join nor matches "EclipseNoir".
 */
export function matchesSeed(svgPath: string, seedId: string): boolean {
  return svgPath.split(/[/\\]/).includes(seedId);
}
