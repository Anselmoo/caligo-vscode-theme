/**
 * wallpaper-spike.ts — render one seed/platform through a chosen composition,
 * measure the SVG budget and rasterise it with Chromium (not CoreSVG, which
 * drops SVG filters).
 *
 * Usage:
 *   npx tsx scripts/wallpaper-spike.ts [--candidates=baseline,desert-night,aurora-refined]
 *
 * Writes spike/wallpapers/<candidate>.{svg,png,thumb.png} and prints a table.
 */

import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { derivePalette } from "../src/lib/palette.js";
import { expandSeedVariants, loadAllSeeds } from "../src/lib/seeds.js";
import { composeSeedWallpaper } from "../src/wallpaper/compose.js";
import { toSvgDocument } from "../src/wallpaper/composer.js";
import { MODE_COMPOSERS } from "../src/wallpaper/modes/index.js";
import { extractWallpaperColors } from "../src/wallpaper/renderer.js";
import type { BrickParams, ComposedWallpaper } from "../src/wallpaper/types.js";
import { PLATFORM_SIZES } from "../src/wallpaper/types.js";
import { SCENES } from "./wallpaper-scenes.js";

const argOf = (k: string) => process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1];
// --variant=<id>.v-<x> renders src/wallpaper/motifs/<id>.v-<x>.ts on its scene's seed.
const VARIANT = argOf("variant");
const VARIANT_SCENE = VARIANT ? SCENES.find(s => VARIANT.startsWith(`${s.id}.v-`)) : undefined;
if (VARIANT && !VARIANT_SCENE) throw new Error(`unknown variant ${VARIANT}`);
const SEED_ID = argOf("seed") ?? VARIANT_SCENE?.seed ?? "AuroraNoir";
const MODES = (argOf("modes") ?? "none").split(",");
// --platform=monitor|tablet|mobile (the 300 wallpapers ship all three; mobile is portrait).
const PLATFORM = (argOf("platform") ?? "monitor") as keyof typeof PLATFORM_SIZES;
if (!PLATFORM_SIZES[PLATFORM]) throw new Error(`unknown platform ${PLATFORM}`);
const VIEW = {
  w: Math.round(PLATFORM_SIZES[PLATFORM].width / 2),
  h: Math.round(PLATFORM_SIZES[PLATFORM].height / 2),
};
const THUMB = { w: Math.round(VIEW.w / 3), h: Math.round(VIEW.h / 3) };
const HARMONY_TO_THEME: Record<string, string> = {
  none: "Balanced",
  analogous: "Analogous",
  monochromatic: "Monochromatic",
  triadic: "Triadic",
  "split-complementary": "SplitComplementary",
};
const OUT_DIR = resolve(argOf("out") ?? "spike/wallpapers");

// Scenes are loaded lazily, only when requested: a scene file that another
// builder is editing (and that may not parse right now) never blocks renders
// of the others.
const CANDIDATES: Record<string, (p: BrickParams) => ComposedWallpaper> = {
  baseline: p => MODE_COMPOSERS.none(composeSeedWallpaper(p), p),
};
async function loadScene(id: string): Promise<void> {
  if (CANDIDATES[id]) return; // baseline, or a variant registered above
  const scene = SCENES.find(s => s.id === id);
  if (!scene) throw new Error(`unknown candidate ${id}`);
  const mod = await import(pathToFileURL(resolve(`src/wallpaper/motifs/${id}.ts`)).href);
  CANDIDATES[id] = mod[scene.exportName];
}

if (VARIANT && VARIANT_SCENE) {
  const mod = await import(pathToFileURL(resolve(`src/wallpaper/motifs/${VARIANT}.ts`)).href);
  CANDIDATES[VARIANT] = mod[VARIANT_SCENE.exportName];
}
const candArg = argOf("candidates") ?? VARIANT;
const names = candArg ? candArg.split(",") : ["baseline", ...SCENES.map(s => s.id)];
for (const name of names) await loadScene(name);

async function buildParams(mode: string): Promise<BrickParams> {
  const seed = (await loadAllSeeds()).find(s => s.id === SEED_ID);
  if (!seed) throw new Error(`seed ${SEED_ID} not found`);
  const variant = expandSeedVariants(seed).find(v => (v.harmony ?? "none") === mode) ?? seed;
  // biome-ignore lint/suspicious/noExplicitAny: ThemeMode union lives in palette.ts
  const palette = derivePalette(variant, (HARMONY_TO_THEME[mode] ?? "Balanced") as any);
  return {
    viewBox: PLATFORM_SIZES[PLATFORM],
    colors: extractWallpaperColors(palette),
    seedId: SEED_ID,
    harmonyMode: mode,
    platform: PLATFORM,
  };
}

function measure(svg: string) {
  return {
    bytes: Buffer.byteLength(svg),
    elements: (svg.match(/<[a-zA-Z][^\s/>]*/g) ?? []).length,
    filters: (svg.match(/<filter\b/g) ?? []).length,
    turbulence: (svg.match(/<feTurbulence\b/g) ?? []).length,
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const rows: string[] = [];
  const sheets: Record<string, Array<{ mode: string; thumb: string }>> = {};
  const isDefault = SEED_ID === "AuroraNoir" && MODES.length === 1 && MODES[0] === "none";

  for (const mode of MODES) {
    const params = await buildParams(mode);
    for (const name of names) {
      const fn = CANDIDATES[name];
      if (!fn) throw new Error(`unknown candidate ${name}`);
      const base = `${isDefault ? name : `${name}-${SEED_ID}-${mode}`}${PLATFORM === "monitor" ? "" : `-${PLATFORM}`}`;
      const svg = toSvgDocument(fn(params), params.viewBox);
      const again = toSvgDocument(fn(params), params.viewBox);
      const deterministic = svg === again;
      writeFileSync(join(OUT_DIR, `${base}.svg`), svg);

      const page = await browser.newPage({ viewport: { width: VIEW.w, height: VIEW.h } });
      const htmlPath = join(OUT_DIR, `${base}.html`);
      writeFileSync(
        htmlPath,
        `<html><body style="margin:0"><img id="w" src="${base}.svg" style="width:${VIEW.w}px;height:${VIEW.h}px;display:block"></body></html>`
      );
      const t0 = performance.now();
      await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
      await page.evaluate(() => (document.getElementById("w") as HTMLImageElement).decode());
      await page.screenshot({ path: join(OUT_DIR, `${base}.png`) });
      const ms = Math.round(performance.now() - t0);
      await page.setViewportSize({ width: THUMB.w, height: THUMB.h });
      await page.evaluate(t => {
        const img = document.getElementById("w") as HTMLImageElement;
        img.style.width = `${t.w}px`;
        img.style.height = `${t.h}px`;
      }, THUMB);
      await page.screenshot({ path: join(OUT_DIR, `${base}.thumb.png`) });
      await page.close();
      rmSync(htmlPath);
      sheets[name] = [...(sheets[name] ?? []), { mode, thumb: `${base}.thumb.png` }];

      const m = measure(svg);
      const sha = createHash("sha256").update(svg).digest("hex").slice(0, 12);
      rows.push(
        `| ${base} | ${(m.bytes / 1024).toFixed(1)} KB | ${m.elements} | ${m.filters} | ${m.turbulence} | ${ms} ms | ${deterministic ? "yes" : "NO"} (${sha}) |`
      );
    }
  }

  // Contact sheet: every requested mode side by side, for judging at a glance.
  if (MODES.length > 1) {
    for (const [name, cells] of Object.entries(sheets)) {
      const htmlPath = join(OUT_DIR, `${name}-${SEED_ID}-sheet.html`);
      const figs = cells
        .map(
          c =>
            `<figure style="margin:0"><img src="${c.thumb}" style="width:640px;height:360px;display:block"><figcaption style="font:16px system-ui;color:white;padding:6px 0 14px">${SEED_ID} · ${c.mode}</figcaption></figure>`
        )
        .join("");
      writeFileSync(
        htmlPath,
        `<html><body style="margin:0;padding:16px;background:black;display:grid;grid-template-columns:repeat(3,640px);gap:0 16px">${figs}</body></html>`
      );
      const page = await browser.newPage({ viewport: { width: 1984, height: 900 } });
      await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
      await page.screenshot({
        path: join(OUT_DIR, `${name}-${SEED_ID}-modes.png`),
        fullPage: true,
      });
      await page.close();
      rmSync(htmlPath);
    }
  }
  await browser.close();

  console.log(
    "| candidate | size | elements | filters | feTurbulence | Chromium render | deterministic |"
  );
  console.log("|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(r);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
