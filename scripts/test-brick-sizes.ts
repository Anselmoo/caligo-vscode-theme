import { derivePalette } from "../src/lib/palette.js";
import { expandSeedVariants, loadAllSeeds } from "../src/lib/seeds.js";
import { renderWallpaperSvg } from "../src/wallpaper/renderer.js";
import type { WallpaperSpec } from "../src/wallpaper/types.js";

async function main() {
  const seeds = await loadAllSeeds();
  const seed = seeds.find(s => s.id === "AuroraNoir") ?? seeds[0];
  const variants = expandSeedVariants(seed);
  // split-comp is index 2
  const variant = variants[2];
  const palette = derivePalette(variant, "SplitComplementary");

  const spec: WallpaperSpec = {
    seedId: "AuroraNoir",
    seedDisplayName: "Aurora Noir",
    harmonyMode: "split-complementary",
    topic: "Break",
    platform: "monitor",
    textVariant: "no-text",
    displayName: "Aurora Noir · Break",
  };

  const svg = renderWallpaperSvg({ palette, spec });
  console.log(`Total SVG size: ${(svg.length / 1024).toFixed(1)} KB`);

  // Find each unique id in the SVG to identify which brick generates the most
  const idMatches = [...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  const uniquePrefixes = new Set(idMatches.map(id => id.split("-").slice(0, 3).join("-")));
  console.log("Unique ID prefixes:", [...uniquePrefixes].join(", "));

  // Find element counts
  const rects = svg.match(/<rect/g)?.length ?? 0;
  const circles = svg.match(/<circle/g)?.length ?? 0;
  const paths = svg.match(/<path/g)?.length ?? 0;
  const lines = svg.match(/<line/g)?.length ?? 0;
  console.log(`rects: ${rects}, circles: ${circles}, paths: ${paths}, lines: ${lines}`);
}

main().catch(console.error);
