// The only module that touches `apca-w3`; src/lib/contrast.ts builds on it and every other
// consumer (generator, gates, web app) goes through contrast.ts. Uses a namespace ESM import to
// avoid mixing CommonJS require() with top-level await in an ESM environment.
import * as apca from "apca-w3";

type ApcaImpl = {
  APCAcontrast: (txtY: number, bgY: number) => number;
  sRGBtoY: (rgb: [number, number, number]) => number;
};

const impl = apca as unknown as ApcaImpl;

/** Signed APCA Lc for text luminance `fgY` on background luminance `bgY`. */
export function APCAcontrast(fgY: number, bgY: number): number {
  return impl.APCAcontrast(fgY, bgY);
}

/** apca-w3 luminance of an sRGB triple (0..255, floats allowed). */
export function sRGBtoY(rgb: [number, number, number]): number {
  return impl.sRGBtoY(rgb);
}
