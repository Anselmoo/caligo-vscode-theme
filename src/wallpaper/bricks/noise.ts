/**
 * Noise / turbulence bricks — SVG filter-based texture overlays.
 * Adds organic grain or fluid turbulence to wallpapers.
 */
import type { BrickOutput, BrickParams } from "../types.js";
import { fmtCoord, fmtLength } from "./svg-format.js";

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
  return {
    defs: `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="${numOctaves}" stitchTiles="stitch" result="turbOut"/>
  <feColorMatrix in="turbOut" type="saturate" values="0" result="grayNoise"/>
  <feBlend in="SourceGraphic" in2="grayNoise" mode="screen" result="blend"/>
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
  const gcx = fmtCoord(cx * width);
  const gcy = fmtCoord(cy * height);
  const gr = fmtLength(r * Math.max(width, height));

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
