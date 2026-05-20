/**
 * Noise / turbulence bricks — SVG filter-based texture overlays.
 * Adds organic grain or fluid turbulence to wallpapers.
 */
import type { BrickOutput, BrickParams } from "../types.js";

export interface NoiseBrickOptions {
  id?: string;
  opacity?: number;
  baseFrequency?: number;
  numOctaves?: number;
}

/** Monochrome fractal noise — subtle grain/film texture */
export function noiseBrick(params: BrickParams, options: NoiseBrickOptions = {}): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { id = "noise", opacity = 0.035, baseFrequency = 0.65, numOctaves = 4 } = options;
  const microFreqX = (baseFrequency * 1.75).toFixed(2);
  const microFreqY = (baseFrequency * 2.15).toFixed(2);
  return {
    defs: `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="${numOctaves}" stitchTiles="stitch" seed="19" result="macro"/>
  <feTurbulence type="fractalNoise" baseFrequency="${microFreqX} ${microFreqY}" numOctaves="${Math.max(2, numOctaves - 1)}" stitchTiles="stitch" seed="31" result="micro"/>
  <feBlend in="macro" in2="micro" mode="multiply" result="grainMix"/>
  <feColorMatrix in="grainMix" type="saturate" values="0" result="grayNoise"/>
  <feComponentTransfer in="grayNoise" result="grain">
    <feFuncR type="gamma" amplitude="0.55" exponent="1.35" offset="0.18"/>
    <feFuncG type="gamma" amplitude="0.55" exponent="1.35" offset="0.18"/>
    <feFuncB type="gamma" amplitude="0.55" exponent="1.35" offset="0.18"/>
  </feComponentTransfer>
  <feBlend in="SourceGraphic" in2="grain" mode="screen" result="blend"/>
  <feComposite in="blend" in2="SourceGraphic" operator="in"/>
</filter>`,
    elements: `<rect width="${width}" height="${height}" opacity="${opacity}" filter="url(#${id})"/>`,
  };
}

export interface TurbulenceBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  baseFrequency?: number;
  numOctaves?: number;
  /** Fraction of viewBox for the colored turbulence layer */
  cx?: number;
  cy?: number;
  r?: number;
}

export interface NebulaDustBrickOptions {
  id?: string;
  /** Hex color used as constant RGB tint for the dust clouds */
  tintColor: string;
  /** Rect opacity over the full canvas (default 0.35) */
  opacity?: number;
  /** feTurbulence baseFrequency — keep ≤0.015 for large organic clouds (default 0.012) */
  baseFrequency?: number;
  numOctaves?: number;
  /** feColorMatrix alpha-row scale — controls how opaque the dust blobs are (default 0.28) */
  alphaStrength?: number;
  seed?: number;
}

/**
 * Cosmic dust overlay — large nebular structures (NOT fine grain).
 *
 * Uses very low base frequencies so the resulting "dust" forms broad organic
 * cloud regions that span 1/3+ of the canvas — what real nebula photographs look like.
 * Includes a heavy gaussian blur so the structures soften into nebular gas.
 */
export function nebulaDustBrick(params: BrickParams, options: NebulaDustBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "nebula-dust",
    tintColor,
    opacity = 0.35,
    baseFrequency = 0.0035, // much lower — large nebula structures, not fine grain
    numOctaves = 4,
    alphaStrength = 0.55, // higher so visible against dark backgrounds
    seed = 7,
  } = options;

  const hex = tintColor.replace(/^#/, "");
  const r = (parseInt(hex.slice(0, 2), 16) / 255).toFixed(4);
  const g = (parseInt(hex.slice(2, 4), 16) / 255).toFixed(4);
  const b = (parseInt(hex.slice(4, 6), 16) / 255).toFixed(4);
  const a = alphaStrength.toFixed(4);
  const blurSd = (scale * 0.012).toFixed(0);

  return {
    defs: `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${baseFrequency} ${(baseFrequency * 0.7).toFixed(4)}" numOctaves="${numOctaves}" seed="${seed}" result="dust"/>
  <feColorMatrix in="dust" type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 ${a} -0.18" result="tinted"/>
  <feGaussianBlur in="tinted" stdDeviation="${blurSd}"/>
</filter>`,
    elements: `<rect width="${width}" height="${height}" opacity="${opacity}" filter="url(#${id})"/>`,
  };
}

/** Coloured turbulence cloud — for nebula / fog effects */
export function turbulenceBrick(params: BrickParams, options: TurbulenceBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const {
    id = "turb",
    color,
    opacity = 0.3,
    baseFrequency = 0.003,
    numOctaves = 6,
    cx = 0.5,
    cy = 0.4,
    r = 0.45,
  } = options;

  const gid = `${id}-g`;
  const gcx = (cx * width).toFixed(0);
  const gcy = (cy * height).toFixed(0);
  const gr = (r * Math.max(width, height)).toFixed(0);

  return {
    defs: `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
  <feTurbulence type="turbulence" baseFrequency="${baseFrequency}" numOctaves="${numOctaves}" seed="42" result="t"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 4 -1.5" result="shaped"/>
  <feFlood flood-color="${color}" result="clr"/>
  <feComposite in="clr" in2="shaped" operator="in"/>
</filter>
<radialGradient id="${gid}" cx="${gcx}" cy="${gcy}" r="${gr}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<rect width="${width}" height="${height}" fill="url(#${gid})" filter="url(#${id})"/>`,
  };
}
