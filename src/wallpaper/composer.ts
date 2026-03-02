/**
 * SVG Composer — assembles brick outputs into a complete, valid SVG document.
 *
 * The composer is the only place that emits the SVG root element.
 * All bricks and motifs contribute fragments; the composer wraps them.
 */
import type { BrickOutput, ComposedWallpaper, ViewBox } from "./types.js";

/**
 * Merge multiple BrickOutputs into a single ComposedWallpaper,
 * deduplicating IDs in defs (first wins).
 */
export function mergeBricks(outputs: BrickOutput[]): ComposedWallpaper {
  const seenIds = new Set<string>();
  const defsFragments: string[] = [];
  const elementFragments: string[] = [];

  for (const out of outputs) {
    if (out.defs) {
      // Extract IDs from defs to deduplicate
      const ids = [...out.defs.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      const alreadySeen = ids.some(id => seenIds.has(id));
      if (!alreadySeen) {
        for (const id of ids) seenIds.add(id);
        defsFragments.push(out.defs.trim());
      }
    }
    if (out.elements) {
      elementFragments.push(out.elements.trim());
    }
  }

  return {
    defs: defsFragments.join("\n"),
    elements: elementFragments.join("\n"),
  };
}

/**
 * Wrap a ComposedWallpaper into a complete SVG document string.
 */
export function toSvgDocument(composed: ComposedWallpaper, viewBox: ViewBox): string {
  const { width, height } = viewBox;
  const defsBlock =
    composed.defs.trim() !== "" ? `\n  <defs>\n${indent(composed.defs, 4)}\n  </defs>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defsBlock}
  ${composed.elements.replace(/\n/g, "\n  ")}
</svg>`;
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map(l => `${pad}${l}`)
    .join("\n");
}
