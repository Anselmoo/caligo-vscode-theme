/**
 * Independent oracles and loaders for the contrast-truth suite.
 *
 * Nothing in here imports from src/**: every expected number is computed with
 * culori (WCAG 2.x ratio, source-over blend) or apca-w3 (APCA Lc), so a test
 * comparing src/lib against these functions is a differential test against a
 * second implementation, not a test of the code against itself.
 *
 * Compositing convention pinned by this suite (see contract.json):
 *   - source-over ("normal") blend in gamma-encoded sRGB, the way browsers and
 *     VS Code paint translucent colors;
 *   - UNROUNDED float channels (no 8-bit quantisation), so results are
 *     reproducible to 1e-6 against culori.blend;
 *   - layers are listed bottom -> top and the bottom layer must be opaque.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APCAcontrast, sRGBtoY } from "apca-w3";
import * as culori from "culori";

export const REPO_ROOT = process.cwd();
export const TOL = 1e-6;

type CuloriRgb = { mode: "rgb"; r: number; g: number; b: number; alpha?: number };
type CuloriLike = {
  parse: (s: string) => unknown;
  rgb: (c: unknown) => CuloriRgb | undefined;
  blend: (colors: unknown[], type?: string, mode?: string) => CuloriRgb;
  wcagContrast: (a: unknown, b: unknown) => number;
};
const C = culori as unknown as CuloriLike;

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

function toCulori(hex: string): CuloriRgb {
  if (!HEX.test(hex)) throw new Error(`oracle: expected #RRGGBB(AA), got ${hex}`);
  const c = C.rgb(C.parse(hex));
  if (!c) throw new Error(`oracle: culori could not parse ${hex}`);
  return c;
}

/** Flatten a bottom -> top stack of hex colors with culori's source-over blend. */
export function oracleFlatten(layers: readonly string[]): CuloriRgb {
  if (layers.length === 0) throw new Error("oracle: empty stack");
  const parsed = layers.map(toCulori);
  if ((parsed[0].alpha ?? 1) !== 1) {
    throw new Error(`oracle: bottom layer ${layers[0]} is not opaque`);
  }
  return parsed.length === 1 ? parsed[0] : C.blend(parsed, "normal", "rgb");
}

/** fg (possibly translucent) painted over the flattened stack. */
export function oracleResolve(fg: string, layers: readonly string[]) {
  const bg = oracleFlatten(layers);
  const f = C.blend([bg, toCulori(fg)], "normal", "rgb");
  return { fg: f, bg };
}

const to255 = (c: CuloriRgb): [number, number, number] => [c.r * 255, c.g * 255, c.b * 255];

/** WCAG 2.x ratio of fg drawn over the stack, via culori. */
export function oracleWcag(fg: string, layers: readonly string[]): number {
  const { fg: f, bg } = oracleResolve(fg, layers);
  return C.wcagContrast(f, bg);
}

/** Signed APCA Lc (text, background order) of fg drawn over the stack, via apca-w3. */
export function oracleApcaSigned(fg: string, layers: readonly string[]): number {
  const { fg: f, bg } = oracleResolve(fg, layers);
  return APCAcontrast(sRGBtoY(to255(f)), sRGBtoY(to255(bg)));
}

/**
 * Import a module by repo-relative path without letting a missing file abort the
 * whole test file at collection time. Returns the module namespace or the error.
 */
export async function loadModule<T = Record<string, unknown>>(
  repoRelative: string
): Promise<{ mod?: T; error?: unknown }> {
  const abs = path.resolve(REPO_ROOT, repoRelative);
  if (!fs.existsSync(abs)) return { error: new Error(`missing file ${repoRelative}`) };
  try {
    return { mod: (await import(/* @vite-ignore */ pathToFileURL(abs).href)) as T };
  } catch (error) {
    return { error };
  }
}

export type ThemeFile = { name: string; json: Record<string, unknown> };

/** Shipped themes: themes/Caligo-*.json (the pretest placeholder is ignored). */
export function loadShippedThemes(): ThemeFile[] {
  const dir = path.join(REPO_ROOT, "themes");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => /^Caligo-.+\.json$/.test(f))
    .sort()
    .map(f => ({
      name: f.replace(/\.json$/, ""),
      json: JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Record<string, unknown>,
    }));
}

export function readText(repoRelative: string): string | undefined {
  const abs = path.resolve(REPO_ROOT, repoRelative);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : undefined;
}

/** Recursively list files under a repo-relative directory. */
export function listFiles(repoRelative: string): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    const abs = path.resolve(REPO_ROOT, rel);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const child = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) walk(child);
      else out.push(child);
    }
  };
  walk(repoRelative);
  return out.sort();
}
