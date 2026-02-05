// Lightweight wrapper around the APCA module. Use ESM imports to avoid
// mixing CommonJS require() with top-level await in an ESM environment.
import * as apca from "apca-w3";

export function APCAcontrast(fgY: number, bgY: number): number {
  const impl = apca as unknown as {
    APCAcontrast: (a: number, b: number) => number;
    sRGBtoY: (r: [number, number, number]) => number;
  };
  return impl.APCAcontrast(fgY, bgY);
}

export function sRGBtoY(rgb: [number, number, number]): number {
  const impl = apca as unknown as {
    APCAcontrast: (a: number, b: number) => number;
    sRGBtoY: (r: [number, number, number]) => number;
  };
  return impl.sRGBtoY(rgb);
}
