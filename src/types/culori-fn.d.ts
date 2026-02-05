declare module "culori/fn" {
  export function converter(mode: string): (color: unknown) => unknown;
  export function differenceEuclidean(
    mode?: string,
    weights?: number[]
  ): (a: unknown, b: unknown) => number;
  export function displayable(color: unknown): boolean;
}
