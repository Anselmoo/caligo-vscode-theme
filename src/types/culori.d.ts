declare module "culori" {
  export type Oklch = {
    mode: "oklch";
    l: number;
    c: number;
    h: number;
    alpha?: number;
  };

  export function clampRgb(color: unknown): unknown;
  export function converter(mode: string): (color: unknown) => unknown;
  export function differenceEuclidean(
    mode?: string,
    weights?: number[]
  ): (a: unknown, b: unknown) => number;
  export function displayable(color: unknown): boolean;
  export function formatHex(color: unknown): string;
  export function formatHex8(color: unknown): string;
  export function formatRgb(color: unknown): string;
  export function oklch(color: string): Oklch | null;
}
