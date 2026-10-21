/**
 * Overlay fitting: a state background (selection, match highlight, focus) must never be the
 * reason the text drawn on it becomes unreadable.
 *
 * Selections and highlights are accent tints laid over a surface at partial alpha. On a dark
 * theme a bright tint lifts the composite toward mid-grey, and text that clears 4.5:1 on the bare
 * surface drops below it on the selected row. The tint's hue is the state's identity and its
 * alpha sets how "glassy" it looks, so neither is touched here. The lever is the tint's OKLCH
 * lightness: walk it away from the text until every reader clears its floor, keeping hue and
 * alpha exactly and mapping chroma back into sRGB.
 *
 * Who reads an overlay comes from the contrast registry (CONTRAST_PAIRS), the same table the
 * contrast gate scores, so the generator and the gate cannot disagree on which text sits on which
 * stack.
 *
 * Two limits keep the solve honest:
 *   - A reader that already fails on the bare surface is skipped. Its text color is the problem,
 *     and chasing it would drive the overlay to black for nothing.
 *   - The overlay keeps at least half of its designed visibility (OKLab distance between the
 *     surface with and without it). Past that it stops working as the state marker it was
 *     designed to be, and the failing pair is left on the ratchet instead.
 */
import { converter, formatHex } from "culori";
import { oklch } from "./color.js";
import { deltaEOklch } from "./color-utils.js";
import { flattenLayers, type Rgba, relativeLuminance, wcagContrastRatio } from "./contrast.js";
import { CODE_STACKS, CONTRAST_PAIRS, WCAG_MIN } from "./contrast-pairs.js";
import { gamutMap } from "./contrast-solve.js";

const toOklch = converter("oklch") as (c: string) => { l: number; c?: number; h?: number };

/** Fraction of an overlay's designed visibility it may give up to make its text readable. */
const MIN_VISIBILITY_KEPT = 0.5;

/** Lightness step of the walk; finer than any perceptible step. */
const L_STEP = 0.01;

type Reader = { fg: string; base: string[]; min: number };

const toHex = (c: Rgba): string =>
  formatHex({ mode: "rgb", r: c.r / 255, g: c.g / 255, b: c.b / 255 });

/** OKLab distance of each base with the overlay on top versus without it; the smallest one. */
function visibility(bases: string[][], overlay: string): number {
  let min = Number.POSITIVE_INFINITY;
  for (const base of bases) {
    const with_ = toHex(flattenLayers([...base, overlay]));
    const without = toHex(flattenLayers(base));
    min = Math.min(min, deltaEOklch(with_, without));
  }
  return min;
}

const passes = (readers: Reader[], overlay: string): boolean =>
  readers.every(r => wcagContrastRatio(r.fg, overlay, r.base) >= r.min);

/**
 * Fit one overlay. Returns the original hex when nothing fails, when the readers disagree on
 * which way the overlay should move, or when no step within the visibility budget helps.
 */
function fitOverlay(overlay: string, readers: Reader[], bases: string[][]): string {
  const active = readers.filter(
    r => wcagContrastRatio(r.fg, r.base[r.base.length - 1], r.base.slice(0, -1)) >= r.min
  );
  if (active.length === 0 || passes(active, overlay)) return overlay;

  // Move the composite away from the text: darker under light text, lighter under dark text.
  const directions = new Set(
    active.map(r => {
      const surface = relativeLuminance(flattenLayers([...r.base, overlay]));
      const text = relativeLuminance(flattenLayers([...r.base, r.fg]));
      return text > surface ? -1 : 1;
    })
  );
  if (directions.size !== 1) return overlay;
  const direction = [...directions][0];

  const tint = toOklch(overlay.slice(0, 7));
  const alphaByte = overlay.slice(7);
  const floor = MIN_VISIBILITY_KEPT * visibility(bases, overlay);

  let best = overlay;
  for (let l = tint.l + direction * L_STEP; l > 0 && l < 1; l += direction * L_STEP) {
    const mapped = gamutMap(oklch(l, tint.c ?? 0, tint.h ?? 0));
    const candidate =
      formatHex({ mode: "oklch", l: mapped.l, c: mapped.c, h: mapped.h }) + alphaByte;
    if (visibility(bases, candidate) < floor) break;
    best = candidate;
    if (passes(active, candidate)) return candidate;
  }
  // Budget exhausted: keep the best step reached; the remaining failures stay on the ratchet.
  return best;
}

/** Code stacks as `{ overlay, base }`: the top layer and the keys under it, bottom -> top. */
const CODE_OVERLAYS = CODE_STACKS.map(stack => {
  const keys = stack.split(">");
  return { overlay: keys[keys.length - 1], base: keys.slice(0, -1) };
});

/** Overlay keys in the order they must be fitted: lower layers of a stack before upper ones. */
const OVERLAY_ORDER: readonly string[] = (() => {
  const depth = new Map<string, number>();
  const note = (key: string, d: number) => depth.set(key, Math.max(depth.get(key) ?? 0, d));
  for (const p of CONTRAST_PAIRS) {
    if (p.base === undefined) continue;
    note(p.bg, ([] as string[]).concat(p.base).length);
  }
  for (const { overlay, base } of CODE_OVERLAYS) note(overlay, base.length);
  return [...depth.entries()].sort((a, b) => a[1] - b[1]).map(([key]) => key);
})();

/**
 * Fit every translucent or stacked background in `colors` to the text the registry says is drawn
 * on it. Returns a new map; keys the registry does not stack over a base are untouched.
 *
 * `inks` are the theme's code colors (tokenColors / semanticTokenColors foregrounds). They read
 * every overlay of a CODE_STACKS stack at the text floor; an ink that already fails under the
 * overlay's base is skipped like any other reader.
 *
 * Apply once, to the designed colors: the visibility budget is measured from the overlay passed
 * in, so a second pass would spend another half on any overlay that already stopped at it.
 */
export function fitOverlaysToReaders(
  colors: Record<string, string>,
  inks: readonly string[] = []
): Record<string, string> {
  const out = { ...colors };
  for (const key of OVERLAY_ORDER) {
    const overlay = out[key];
    if (typeof overlay !== "string") continue;
    const readers: Reader[] = [];
    const bases = new Map<string, string[]>();
    for (const p of CONTRAST_PAIRS) {
      if (p.bg !== key || p.base === undefined) continue;
      const baseKeys = ([] as string[]).concat(p.base);
      const base = baseKeys.map(k => out[k]);
      const fg = out[p.fg];
      if (typeof fg !== "string" || base.some(b => typeof b !== "string")) continue;
      readers.push({ fg, base, min: p.min });
      bases.set(baseKeys.join(">"), base);
    }
    for (const stack of CODE_OVERLAYS) {
      if (stack.overlay !== key) continue;
      const base = stack.base.map(k => out[k]);
      if (base.some(b => typeof b !== "string")) continue;
      for (const fg of inks) readers.push({ fg, base, min: WCAG_MIN.text });
      bases.set(stack.base.join(">"), base);
    }
    if (readers.length === 0) continue;
    out[key] = fitOverlay(overlay, readers, [...bases.values()]);
  }
  return out;
}
