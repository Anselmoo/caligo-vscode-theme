/**
 * Architecture bricks — city skyline with Bob Ross 3D drama.
 *
 * Bob Ross 5-pillar lighting model applied:
 *  1. Directional lit/shadow gradient — warm left face, cool right face (sun upper-left)
 *  2. Rim/edge highlights — bright rooftop edges on sun-facing side
 *  3. Atmospheric perspective — far buildings hazy/blue, near buildings sharp/saturated
 *  4. Surface texture — feDiffuseLighting concrete/glass texture on facades
 *  5. Base shadow — dark gradient at building base grounding them to the surface
 */
import type { BrickOutput, BrickParams } from "../types.js";
import { SUN_AZIMUTH, SUN_ELEVATION, WARM_HIGHLIGHT, COOL_SHADOW } from "./lighting.js";

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
  const scale = Math.max(width, height);
  const sc = scale / 960;
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
  const texSeed = (hashStrLocal(`${seedId}-${harmonyMode}-city-tex`) % 89) + 1;

  const defs: string[] = [];
  const elems: string[] = [];
  const bldgWidthLimit = width / density;
  const basePx = baseY * height;

  // ─── Bob Ross Pillar 4: Surface Texture ─────────────────────────────────────
  // feDiffuseLighting for concrete/glass 3D surface depth on building facades
  const concTexId = `${id}-conc`;
  defs.push(`<filter id="${concTexId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="5" seed="${texSeed}" result="concBump"/>
  <feDiffuseLighting in="concBump" surfaceScale="2.5" diffuseConstant="0.65" result="concLit" lighting-color="#8899aa">
    <feDistantLight azimuth="${SUN_AZIMUTH}" elevation="${SUN_ELEVATION}"/>
  </feDiffuseLighting>
  <feComposite in="concLit" in2="SourceGraphic" operator="in"/>
</filter>`);

  // Glass specular — reflective glint on glass facades
  const glassSpecId = `${id}-glass`;
  defs.push(`<filter id="${glassSpecId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.06 0.12" numOctaves="3" seed="${texSeed + 3}" result="glassBump"/>
  <feSpecularLighting in="glassBump" surfaceScale="2" specularConstant="0.35" specularExponent="18" result="glassGlint" lighting-color="#a0b8d0">
    <feDistantLight azimuth="${SUN_AZIMUTH}" elevation="${SUN_ELEVATION}"/>
  </feSpecularLighting>
  <feComposite in="glassGlint" in2="SourceGraphic" operator="in"/>
</filter>`);

  // ─── Bob Ross Pillar 2: Rim highlight filter (soft glow on rooftop edges) ───
  const rimGlowId = `${id}-rimglow`;
  defs.push(`<filter id="${rimGlowId}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(2 * sc).toFixed(1)}"/></filter>`);

  // ─── Bob Ross Pillar 5: Base shadow gradient ──────────────────────────────────
  const baseShadowGradId = `${id}-bshadow`;
  defs.push(`<radialGradient id="${baseShadowGradId}" cx="50%" cy="20%" r="55%">
  <stop offset="0%" stop-color="#000000" stop-opacity="${(opacity * 0.22).toFixed(3)}"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
</radialGradient>`);

  // ─── Bob Ross Pillar 3: Atmospheric haze gradient for distant buildings ──────
  const hazeGradId = `${id}-haze`;
  defs.push(`<linearGradient id="${hazeGradId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${COOL_SHADOW}" stop-opacity="0.10"/>
  <stop offset="60%" stop-color="${COOL_SHADOW}" stop-opacity="0.06"/>
  <stop offset="100%" stop-color="${COOL_SHADOW}" stop-opacity="0"/>
</linearGradient>`);

  // ─── Pre-pass: collect all buildings for depth-sorting ───────────────────────
  interface Building {
    x: number;
    w: number;
    h: number;
    y: number;
    roofShape: number;
    setbackH?: number;
    setbackInset?: number;
    peakH?: number;
    depth: number; // 0=far, 1=close (based on height — taller = closer in perspective)
    litProb: number;
    warmthBias: number;
    floorMoods: number[];
    antennaH?: number;
    antennaX?: number;
    hasBeacon?: boolean;
  }

  const buildings: Building[] = [];
  let bx = 0;

  while (bx < width) {
    const bldgW = (0.3 + rng() * 1.5) * bldgWidthLimit;
    if (bx + bldgW > width && width - bx < bldgW * 0.3) break;

    if (rng() > 0.85) {
      bx += bldgW * (0.2 + rng() * 0.5);
      continue;
    }

    const bldgH = (heightRange[0] + rng() * (heightRange[1] - heightRange[0])) * height;
    const bldgY = basePx - bldgH;
    const roofShape = rng();
    const depth = (bldgH - heightRange[0] * height) / ((heightRange[1] - heightRange[0]) * height);

    const b: Building = {
      x: bx,
      w: bldgW,
      h: bldgH,
      y: bldgY,
      roofShape,
      depth: Math.max(0, Math.min(1, depth)),
      litProb: Math.min(0.8, windowProbability * (1.5 + rng() * 2.5)),
      warmthBias: rng(),
      floorMoods: [],
    };

    if (roofShape >= 0.6 && roofShape < 0.85) {
      b.setbackH = bldgH * (0.15 + rng() * 0.2);
      b.setbackInset = bldgW * (0.08 + rng() * 0.18);
    } else if (roofShape >= 0.85) {
      b.peakH = bldgH * (0.1 + rng() * 0.12);
    }

    // Floor moods for window lighting
    const windowRows = Math.max(4, Math.floor(bldgH / (height * 0.020)));
    for (let r = 0; r < windowRows; r++) {
      b.floorMoods.push(rng() < 0.35 ? 1.7 : rng() < 0.6 ? 1.0 : 0.4);
    }

    // Antenna
    if (rng() > 0.72 && bldgH > height * 0.12) {
      b.antennaH = (0.015 + rng() * 0.05) * height;
      b.antennaX = bx + bldgW * (0.25 + rng() * 0.5);
      b.hasBeacon = rng() > 0.5;
    }

    buildings.push(b);
    bx += bldgW + width * 0.001 * rng();
  }

  // ─── Render buildings ──────────────────────────────────────────────────────────
  for (let bi = 0; bi < buildings.length; bi++) {
    const b = buildings[bi];

    // ── Bob Ross Pillar 3: Atmospheric perspective ──
    // Far (short) buildings get hazier, more transparent, cooler tint
    const atmFade = 1 - (1 - b.depth) * 0.25; // 0.75–1.0
    const bOp = opacity * atmFade;

    // ── Bob Ross Pillar 1: Directional gradient per building ──
    // Sun from upper-left → left face warm, right face cool shadow
    const bGradId = `${id}-bg${bi}`;
    defs.push(`<linearGradient id="${bGradId}" x1="0" y1="0" x2="1" y2="0.3">
  <stop offset="0%" stop-color="${WARM_HIGHLIGHT}" stop-opacity="${(bOp * 0.12).toFixed(3)}"/>
  <stop offset="20%" stop-color="${color}" stop-opacity="${bOp.toFixed(3)}"/>
  <stop offset="70%" stop-color="${color}" stop-opacity="${(bOp * 0.95).toFixed(3)}"/>
  <stop offset="100%" stop-color="${COOL_SHADOW}" stop-opacity="${(bOp * 0.35).toFixed(3)}"/>
</linearGradient>`);

    // Helper: render a building rect with all 3D layers
    const renderBldgRect = (rx: number, ry: number, rw: number, rh: number) => {
      // Base fill with directional gradient
      elems.push(
        `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="url(#${bGradId})"/>`
      );

      // Surface texture (concrete) — clipped to this rect
      const clipId = `${id}-clip${bi}-${rx.toFixed(0)}`;
      defs.push(`<clipPath id="${clipId}"><rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}"/></clipPath>`);

      // Concrete texture overlay
      elems.push(
        `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${color}" opacity="${(bOp * 0.15).toFixed(3)}" filter="url(#${concTexId})" clip-path="url(#${clipId})"/>`
      );

      // Glass specular glint (occasional buildings)
      if (rng() > 0.5) {
        elems.push(
          `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="#ffffff" opacity="${(bOp * 0.025).toFixed(3)}" filter="url(#${glassSpecId})" clip-path="url(#${clipId})"/>`
        );
      }

      // Atmospheric haze on distant buildings
      if (b.depth < 0.4) {
        const hazeFactor = (1 - b.depth * 2.5) * 0.15;
        elems.push(
          `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${COOL_SHADOW}" opacity="${hazeFactor.toFixed(3)}"/>`
        );
      }
    };

    // ── Bob Ross Pillar 5: Base shadow (ground contact) ──
    const shadowW = b.w * 1.2;
    const shadowH = 8 * sc;
    elems.push(
      `<ellipse cx="${(b.x + b.w * 0.5).toFixed(1)}" cy="${(basePx + shadowH * 0.3).toFixed(1)}" rx="${(shadowW * 0.5).toFixed(1)}" ry="${shadowH.toFixed(1)}" fill="url(#${baseShadowGradId})"/>`
    );

    // ── Building shape rendering ──
    if (b.roofShape < 0.6) {
      renderBldgRect(b.x, b.y, b.w, b.h);
    } else if (b.roofShape < 0.85) {
      const setH = b.setbackH!;
      const setIn = b.setbackInset!;
      // Lower (wider) section
      renderBldgRect(b.x, b.y + setH, b.w, b.h - setH);
      // Upper (narrower) section
      renderBldgRect(b.x + setIn, b.y, b.w - setIn * 2, setH);
    } else {
      const peakH = b.peakH!;
      // Body
      renderBldgRect(b.x, b.y + peakH, b.w, b.h - peakH);
      // Triangular peak with directional gradient
      const peakCx = b.x + b.w * 0.5;
      elems.push(
        `<path d="M ${b.x.toFixed(1)} ${(b.y + peakH).toFixed(1)} L ${peakCx.toFixed(1)} ${b.y.toFixed(1)} L ${(b.x + b.w).toFixed(1)} ${(b.y + peakH).toFixed(1)} Z" fill="url(#${bGradId})"/>`
      );
    }

    // ── Bob Ross Pillar 2: Rooftop rim highlight ──
    // Bright warm edge along the top of the building (sun catching the parapet)
    const roofTopY = b.roofShape >= 0.85 ? b.y : (b.roofShape >= 0.6 ? b.y : b.y);
    const roofLeftX = b.roofShape >= 0.6 && b.roofShape < 0.85
      ? b.x + (b.setbackInset || 0) : b.x;
    const roofRightX = b.roofShape >= 0.6 && b.roofShape < 0.85
      ? b.x + b.w - (b.setbackInset || 0) : b.x + b.w;

    if (b.roofShape < 0.85) {
      // Horizontal rooftop highlight — soft glow
      elems.push(
        `<line x1="${roofLeftX.toFixed(1)}" y1="${roofTopY.toFixed(1)}" x2="${roofRightX.toFixed(1)}" y2="${roofTopY.toFixed(1)}" stroke="${WARM_HIGHLIGHT}" stroke-width="${(3.5 * sc).toFixed(1)}" opacity="${(bOp * 0.12).toFixed(3)}" stroke-linecap="round" filter="url(#${rimGlowId})"/>`
      );
      // Crisp highlight
      elems.push(
        `<line x1="${roofLeftX.toFixed(1)}" y1="${roofTopY.toFixed(1)}" x2="${roofRightX.toFixed(1)}" y2="${roofTopY.toFixed(1)}" stroke="${WARM_HIGHLIGHT}" stroke-width="${(1 * sc).toFixed(1)}" opacity="${(bOp * 0.18).toFixed(3)}" stroke-linecap="round"/>`
      );
    }

    // Left edge (sun-facing) rim highlight
    elems.push(
      `<line x1="${b.x.toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${(basePx).toFixed(1)}" stroke="${WARM_HIGHLIGHT}" stroke-width="${(2.5 * sc).toFixed(1)}" opacity="${(bOp * 0.08).toFixed(3)}" stroke-linecap="round" filter="url(#${rimGlowId})"/>`
    );
    elems.push(
      `<line x1="${b.x.toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${(basePx).toFixed(1)}" stroke="${WARM_HIGHLIGHT}" stroke-width="${(0.8 * sc).toFixed(1)}" opacity="${(bOp * 0.14).toFixed(3)}" stroke-linecap="round"/>`
    );

    // ── FACADE STRUCTURE — horizontal floor lines + vertical mullions ──
    if (b.w > width * 0.012) {
      const floorCount = Math.max(4, Math.floor(b.h / (height * 0.020)));
      const floorH = b.h / floorCount;
      for (let f = 1; f < floorCount; f++) {
        const fy = b.y + f * floorH;
        elems.push(
          `<line x1="${b.x.toFixed(1)}" y1="${fy.toFixed(1)}" x2="${(b.x + b.w).toFixed(1)}" y2="${fy.toFixed(1)}" stroke="#000000" stroke-width="0.4" opacity="${(bOp * 0.32).toFixed(2)}"/>`
        );
      }

      const mullionCount = Math.max(3, Math.floor(b.w / (width * 0.008)));
      for (let m = 1; m < mullionCount; m++) {
        const mx = b.x + (m / mullionCount) * b.w;
        elems.push(
          `<line x1="${mx.toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${mx.toFixed(1)}" y2="${(b.y + b.h).toFixed(1)}" stroke="#000000" stroke-width="0.3" opacity="${(bOp * 0.22).toFixed(2)}"/>`
        );
      }
    }

    // ── LIT WINDOWS — with window glow halos ──
    if (hasWindows && b.w > width * 0.005) {
      const windowRows = Math.max(4, Math.floor(b.h / (height * 0.020)));
      const windowCols = Math.max(2, Math.floor((b.w * 0.85) / (width * 0.0075)));

      const marginX = b.w * 0.08;
      const spacingX = (b.w - 2 * marginX) / windowCols;
      const spacingY = b.h / windowRows;
      const winW = Math.min(spacingX * 0.55, width * 0.004);
      const winH = Math.min(spacingY * 0.5, height * 0.01);

      for (let r = 0; r < windowRows; r++) {
        const floorMood = b.floorMoods[r] ?? 1.0;
        for (let c = 0; c < windowCols; c++) {
          const litChance = b.litProb * floorMood;
          if (rng() < litChance) {
            const wx = b.x + marginX + c * spacingX + spacingX * 0.225;
            const wy = b.y + (r + 0.25) * spacingY;
            const winOpacity = 0.55 + rng() * 0.45;
            const colourRoll = rng();
            const finalColor =
              b.warmthBias > 0.55
                ? colourRoll < 0.65 ? "#ffd58c" : colourRoll < 0.85 ? "#ff9a4a" : windowColor
                : colourRoll < 0.5 ? windowColor : colourRoll < 0.8 ? "#a8c8ff" : "#ffd58c";
            elems.push(
              `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${winW.toFixed(1)}" height="${winH.toFixed(1)}" fill="${finalColor}" opacity="${winOpacity.toFixed(2)}"/>`
            );
            // Window glow halo
            if (rng() < 0.3) {
              elems.push(
                `<rect x="${(wx - winW * 0.4).toFixed(1)}" y="${(wy - winH * 0.4).toFixed(1)}" width="${(winW * 1.8).toFixed(1)}" height="${(winH * 1.8).toFixed(1)}" fill="${finalColor}" opacity="${(winOpacity * 0.18).toFixed(2)}"/>`
              );
            }
          }
        }
      }
    }

    // ── ANTENNAS / SPIRES ──
    if (b.antennaH) {
      const antennaSw = Math.max(0.8, width / 1500);
      elems.push(
        `<line x1="${b.antennaX!.toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${b.antennaX!.toFixed(1)}" y2="${(b.y - b.antennaH).toFixed(1)}" stroke="${color}" stroke-width="${antennaSw.toFixed(1)}" opacity="${bOp.toFixed(2)}"/>`
      );
      if (b.hasBeacon) {
        elems.push(
          `<circle cx="${b.antennaX!.toFixed(1)}" cy="${(b.y - b.antennaH).toFixed(1)}" r="${(antennaSw * 1.6).toFixed(1)}" fill="#ff5050" opacity="${(0.6 + rng() * 0.4).toFixed(2)}"/>`
        );
      }
    }
  }

  // ─── Atmospheric haze between buildings and sky ──────────────────────────────
  // Semi-transparent fog band at the skyline horizon — depth separation
  const hazeH = height * 0.03;
  const topBldgY = buildings.length > 0
    ? Math.min(...buildings.map(b => b.y))
    : basePx - height * 0.15;
  const hazeFilterId = `${id}-hazef`;
  defs.push(`<filter id="${hazeFilterId}" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="0 ${(hazeH * 0.5).toFixed(0)}"/></filter>`);
  elems.push(
    `<rect x="0" y="${(basePx - hazeH * 1.5).toFixed(0)}" width="${width}" height="${(hazeH * 2).toFixed(0)}" fill="${COOL_SHADOW}" opacity="${(opacity * 0.08).toFixed(3)}" filter="url(#${hazeFilterId})"/>`
  );

  // ─── Ambient light spill from city windows onto ground/water ────────────────
  const ambientGlowId = `${id}-ambient`;
  defs.push(`<linearGradient id="${ambientGlowId}" x1="0" y1="${basePx.toFixed(0)}" x2="0" y2="${(basePx + height * 0.08).toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#ffd58c" stop-opacity="${(opacity * 0.06).toFixed(3)}"/>
  <stop offset="100%" stop-color="#ffd58c" stop-opacity="0"/>
</linearGradient>`);
  elems.push(
    `<rect x="0" y="${basePx.toFixed(0)}" width="${width}" height="${(height * 0.08).toFixed(0)}" fill="url(#${ambientGlowId})"/>`
  );

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}
