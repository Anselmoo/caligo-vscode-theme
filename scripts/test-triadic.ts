import { derivePalette } from "../src/lib/palette.js";
import { expandSeedVariants, loadAllSeeds } from "../src/lib/seeds.js";
import { renderWallpaperSvg } from "../src/wallpaper/renderer.js";
import type { WallpaperSpec } from "../src/wallpaper/types.js";

async function main() {
  const seeds = await loadAllSeeds();
  const seed = seeds.find(s => s.id === "AuroraNoir") ?? seeds[0];
  const variants = expandSeedVariants(seed);
  const variant = variants.find(v => v.harmony === "triadic") ?? variants[0];
  const palette = derivePalette(variant, "Triadic");

  const spec: WallpaperSpec = {
    seedId: "AuroraNoir",
    seedDisplayName: "Aurora Noir",
    harmonyMode: "triadic",
    topic: "Pulse",
    platform: "monitor",
    textVariant: "no-text",
    displayName: "Aurora Noir · Pulse",
  };

  console.time("render");
  const svg = renderWallpaperSvg({ palette, spec });
  console.timeEnd("render");
  console.log(`SVG size: ${(svg.length / 1024).toFixed(1)} KB`);

  // Check element counts
  const lines = svg.match(/<line/g)?.length ?? 0;
  const paths = svg.match(/<path/g)?.length ?? 0;
  const circles = svg.match(/<circle/g)?.length ?? 0;
  const rects = svg.match(/<rect/g)?.length ?? 0;
  console.log(`lines: ${lines}, paths: ${paths}, circles: ${circles}, rects: ${rects}`);
}

main().catch(console.error);
