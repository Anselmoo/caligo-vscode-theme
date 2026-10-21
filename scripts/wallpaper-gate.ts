/**
 * wallpaper-gate.ts — measurable acceptance for every scene motif and variant.
 *
 * For each scene (and each `<id>.v-<x>.ts` variant next to it) in all five
 * harmony modes on its own theme seed, checks:
 *   · SVG ≤ 10 MB and ≤ 80,000 elements (quality first; watch the Chromium render time)
 *   · deterministic (two renders byte-identical)
 *   · every filter containing feTurbulence is region-restricted
 *     (filterUnits="userSpaceOnUse", width and height ≤ 1024) — no full-canvas noise
 *   · no hex colour literals in the motif source (palette only)
 *
 * Usage: npx tsx scripts/wallpaper-gate.ts [--only=<id|id.v-x>,...]
 * Exits 1 on any violation and prints a table either way.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { derivePalette } from "../src/lib/palette.js";
import { expandSeedVariants, loadAllSeeds } from "../src/lib/seeds.js";
import { toSvgDocument } from "../src/wallpaper/composer.js";
import { extractWallpaperColors } from "../src/wallpaper/renderer.js";
import type { BrickParams, ComposedWallpaper } from "../src/wallpaper/types.js";
import { PLATFORM_SIZES, PLATFORMS } from "../src/wallpaper/types.js";
import { ALL_MODES, HARMONY_TO_THEME, SCENES } from "./wallpaper-scenes.js";

const MOTIF_DIR = resolve("src/wallpaper/motifs");
const MAX_BYTES = 10 * 1024 * 1024; // user, 2026-10-21: "hier zählt Qualität … erhöhe auf 10 MB wenn es sein muss"
const MAX_ELEMENTS = 80000;
const MAX_NOISE_REGION = 1024;

const only = process.argv
  .find(a => a.startsWith("--only="))
  ?.split("=")[1]
  ?.split(",");

type Compose = (p: BrickParams) => ComposedWallpaper;

function unrestrictedTurbulence(svg: string): number {
  let bad = 0;
  for (const m of svg.matchAll(/<filter\b([^>]*)>([\s\S]*?)<\/filter>/g)) {
    if (!m[2].includes("<feTurbulence")) continue;
    const attrs = m[1];
    const user = /filterUnits="userSpaceOnUse"/.test(attrs);
    const w = Number(attrs.match(/\bwidth="([\d.]+)"/)?.[1] ?? Number.POSITIVE_INFINITY);
    const h = Number(attrs.match(/\bheight="([\d.]+)"/)?.[1] ?? Number.POSITIVE_INFINITY);
    if (!user || w > MAX_NOISE_REGION || h > MAX_NOISE_REGION) bad++;
  }
  return bad;
}

async function main() {
  const seeds = await loadAllSeeds();
  const files = readdirSync(MOTIF_DIR);
  const targets: Array<{ name: string; file: string; seed: string; exportName: string }> = [];
  for (const s of SCENES) {
    targets.push({ name: s.id, file: `${s.id}.ts`, seed: s.seed, exportName: s.exportName });
    for (const f of files) {
      const v = f.match(new RegExp(`^${s.id}\\.(v-[a-z0-9]+)\\.ts$`));
      if (v)
        targets.push({ name: `${s.id}.${v[1]}`, file: f, seed: s.seed, exportName: s.exportName });
    }
  }

  const rows: string[] = [];
  let failures = 0;
  for (const t of targets) {
    if (only && !only.includes(t.name)) continue;
    const src = readFileSync(join(MOTIF_DIR, t.file), "utf8");
    const hex = (src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length;
    const mod = await import(pathToFileURL(join(MOTIF_DIR, t.file)).href);
    const compose = mod[t.exportName] as Compose | undefined;
    if (!compose) {
      rows.push(`| ${t.name} | — | missing export ${t.exportName} | FAIL |`);
      failures++;
      continue;
    }
    const seed = seeds.find((s: { id: string }) => s.id === t.seed);
    if (!seed) throw new Error(`seed ${t.seed} not found`);
    for (const mode of ALL_MODES)
      for (const platform of PLATFORMS) {
        const variant =
          expandSeedVariants(seed).find(
            (v: { harmony?: string }) => (v.harmony ?? "none") === mode
          ) ?? seed;
        // biome-ignore lint/suspicious/noExplicitAny: ThemeMode union lives in palette.ts
        const palette = derivePalette(variant, (HARMONY_TO_THEME[mode] ?? "Balanced") as any);
        const params: BrickParams = {
          viewBox: PLATFORM_SIZES[platform],
          colors: extractWallpaperColors(palette),
          seedId: t.seed,
          harmonyMode: mode,
          platform,
        };
        const a = toSvgDocument(compose(params), params.viewBox);
        const b = toSvgDocument(compose(params), params.viewBox);
        const bytes = Buffer.byteLength(a);
        const elements = (a.match(/<[a-zA-Z][^\s/>]*/g) ?? []).length;
        const noise = unrestrictedTurbulence(a);
        const problems = [
          bytes > MAX_BYTES ? `size ${(bytes / 1024).toFixed(1)} KB` : "",
          elements > MAX_ELEMENTS ? `${elements} elements` : "",
          a !== b ? "non-deterministic" : "",
          noise > 0 ? `${noise} full-canvas feTurbulence` : "",
          hex > 0 && mode === "none" && platform === "monitor" ? `${hex} hex literals` : "",
        ].filter(Boolean);
        if (problems.length) failures++;
        rows.push(
          `| ${t.name} | ${mode} · ${platform} | ${(bytes / 1024).toFixed(1)} KB · ${elements} el | ${problems.length ? `FAIL: ${problems.join(", ")}` : "ok"} |`
        );
      }
  }
  console.log("| scene | mode | budget | verdict |\n|---|---|---|---|");
  for (const r of rows) console.log(r);
  console.log(failures ? `\nGATE FAILED: ${failures} violation(s)` : "\nGATE OK");
  process.exit(failures ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
