import { Delaunay } from "d3-delaunay";
import type { BrickOutput, BrickParams } from "../types.js";

// Helper copied from composer/renderer
export function seedRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function hashStrLocal(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i);
  return hash >>> 0;
}

export interface VoronoiBrickOptions {
  id?: string;
  points: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  fillOpacity?: number;
  mode?: "voronoi" | "delaunay";
  yRange?: [number, number]; // constrain generation to this Y region (fractions)
  relaxIterations?: number; // Lloyd's relaxation for more uniform cells
}

export function voronoiBrick(params: BrickParams, options: VoronoiBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const {
    id = "voronoi",
    points,
    color,
    opacity = 1.0,
    strokeWidth = 1,
    fillOpacity = 0.05,
    mode = "voronoi",
    yRange = [0, 1],
    relaxIterations = 0,
  } = options;

  const rng = seedRng(hashStrLocal(`${seedId}-${harmonyMode}-voronoi-${id}`));

  const pointsArr = new Float64Array(points * 2);

  for (let i = 0; i < points; i++) {
    pointsArr[i * 2] = rng() * width;
    pointsArr[i * 2 + 1] = (yRange[0] + rng() * (yRange[1] - yRange[0])) * height;
  }

  let delaunay = new Delaunay(pointsArr);

  // Lloyd's relaxation
  if (mode === "voronoi" && relaxIterations > 0) {
    for (let k = 0; k < relaxIterations; k++) {
      const voronoi = delaunay.voronoi([0, 0, width, height]);
      for (let i = 0; i < points; i++) {
        const poly = voronoi.cellPolygon(i);
        if (!poly) continue;
        let cx = 0;
        let cy = 0;
        for (let j = 0; j < poly.length - 1; j++) {
          cx += poly[j][0];
          cy += poly[j][1];
        }
        pointsArr[i * 2] = cx / (poly.length - 1);
        pointsArr[i * 2 + 1] = cy / (poly.length - 1);
      }
      delaunay = new Delaunay(pointsArr);
    }
  }

  const elems: string[] = [];

  // Add a nice subtle glow/blur filter
  const defs = `<filter id="${id}-glow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="${strokeWidth * 1.5}"/>
  </filter>`;

  if (mode === "delaunay") {
    // Render triangles
    const pathData = delaunay.render();
    if (pathData) {
      elems.push(
        `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" filter="url(#${id}-glow)"/>`
      );
      elems.push(
        `<path d="${pathData}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
      );
    }
  } else {
    // Render Voronoi cells
    const voronoi = delaunay.voronoi([0, 0, width, height]);
    const pathData = voronoi.render();
    if (pathData) {
      elems.push(
        `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" filter="url(#${id}-glow)"/>`
      );
      elems.push(
        `<path d="${pathData}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
      );
    }
  }

  return {
    defs,
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}
