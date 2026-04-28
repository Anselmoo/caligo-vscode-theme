import type { BrickOutput, BrickParams } from "../types.js";
export function seedRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// Helper copied from composer/renderer if necessary or just relative import
// The signature of hashStr is usually in landscape.ts, let's copy it here just for safety or import it if exported.
export function hashStrLocal(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i);
  return hash >>> 0;
}

export interface CityscapeBrickOptions {
  id?: string;
  baseY: number; // 0 to 1
  heightRange: [number, number]; // fraction of height for building heights
  density: number; // number of buildings approx
  color: string;
  opacity?: number;
  hasWindows?: boolean;
  windowColor?: string;
  windowProbability?: number; // 0 to 1
}

export function cityscapeBrick(params: BrickParams, options: CityscapeBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const {
    id = "city",
    baseY,
    heightRange,
    density,
    color,
    opacity = 1.0,
    hasWindows = false,
    windowColor = "#ffffff",
    windowProbability = 0.2,
  } = options;

  const rng = seedRng(hashStrLocal(`${seedId}-${harmonyMode}-cityscape-${id}`));

  const elems: string[] = [];
  const bldgWidthLimit = width / density;

  let x = 0;

  while (x < width) {
    const bldgW = (0.3 + rng() * 1.5) * bldgWidthLimit;
    if (x + bldgW > width && width - x < bldgW * 0.3) {
      break;
    }

    // Gap probability
    if (rng() > 0.85) {
      x += bldgW * (0.2 + rng() * 0.5);
      continue;
    }

    const bldgH = (heightRange[0] + rng() * (heightRange[1] - heightRange[0])) * height;
    const bldgY = baseY * height - bldgH;

    // Draw building rect
    elems.push(
      `<rect x="${x.toFixed(1)}" y="${bldgY.toFixed(1)}" width="${bldgW.toFixed(1)}" height="${bldgH.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`
    );

    // Optional lit windows
    if (hasWindows && bldgW > width * 0.005) {
      const windowRows = Math.floor(bldgH / (height * 0.01));
      const windowCols = Math.floor((bldgW * 0.8) / (width * 0.003));

      if (windowRows > 2 && windowCols > 1) {
        const marginX = bldgW * 0.1;
        const spacingX = (bldgW - 2 * marginX) / windowCols;
        const spacingY = height * 0.01;

        for (let r = 1; r < windowRows; r++) {
          for (let c = 0; c < windowCols; c++) {
            if (rng() < windowProbability) {
              const wx = x + marginX + c * spacingX;
              const wy = bldgY + r * spacingY;
              elems.push(
                `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${(spacingX * 0.6).toFixed(1)}" height="${(spacingY * 0.6).toFixed(1)}" fill="${windowColor}" opacity="${(0.4 + rng() * 0.6).toFixed(2)}" />`
              );
            }
          }
        }
      }
    }

    // Draw antennas/spires randomly on top
    if (rng() > 0.8) {
      const antennaH = (0.01 + rng() * 0.04) * height;
      const antennaX = x + bldgW * (0.2 + rng() * 0.6);
      elems.push(
        `<line x1="${antennaX.toFixed(1)}" y1="${bldgY.toFixed(1)}" x2="${antennaX.toFixed(1)}" y2="${(bldgY - antennaH).toFixed(1)}" stroke="${color}" stroke-width="1.5" opacity="${opacity.toFixed(2)}" />`
      );
    }

    x += bldgW + width * 0.001 * rng(); // tiny gap
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}
