declare module "apca-w3" {
  export function APCAcontrast(textY: number, backgroundY: number): number;
  export function sRGBtoY(color: string | [number, number, number] | number[]): number;
}
