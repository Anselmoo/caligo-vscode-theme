/**
 * Manifest helpers shared by the generator script and its tests.
 */

/**
 * The gallery thumbnail path for a wallpaper SVG, or `undefined` when no
 * thumbnail has been rasterised for it.
 *
 * Thumbnails are generated in CI and never committed, so a plain local
 * `wallpapers:generate` produces SVGs with no `.webp` beside them. Advertising a
 * thumbPath in that case would put a 404 in every card, so the caller falls back
 * to the SVG instead.
 *
 * @param svgPath    Manifest-relative SVG path, e.g. "wallpapers/X/balanced/monitor.svg".
 * @param thumbExists Predicate answering whether that thumbnail is on disk.
 */
export function resolveThumbPath(
  svgPath: string,
  thumbExists: (thumbPath: string) => boolean
): string | undefined {
  const thumbPath = svgPath.replace(/\.svg$/, ".webp");
  return thumbExists(thumbPath) ? thumbPath : undefined;
}
