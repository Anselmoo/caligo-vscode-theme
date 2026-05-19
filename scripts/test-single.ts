import { writeFileSync } from "node:fs";
import { derivePalette } from "../src/lib/palette.js";
import { expandSeedVariants, loadAllSeeds } from "../src/lib/seeds.js";
import { renderWallpaperSvg } from "../src/wallpaper/renderer.js";
import type { WallpaperSpec } from "../src/wallpaper/types.js";

async function main() {
  const seeds = await loadAllSeeds();
  const seed = seeds.find(s => s.id === "AuroraNoir") ?? seeds[0];
  const variants = expandSeedVariants(seed);
  const variant = variants[0];
  const palette = derivePalette(variant, "Balanced");

  const spec: WallpaperSpec = {
    seedId: "AuroraNoir",
    seedDisplayName: "Aurora Noir",
    harmonyMode: "none",
    topic: "Core",
    platform: "monitor",
    textVariant: "no-text",
    displayName: "Aurora Noir · Core",
  };

  console.time("render");
  const svg = renderWallpaperSvg({ palette, spec });
  console.timeEnd("render");
  console.log(`SVG size: ${(svg.length / 1024).toFixed(1)} KB`);

  writeFileSync("/tmp/test-wallpaper.svg", svg);
  console.log("Written to /tmp/test-wallpaper.svg");
}

main().catch(console.error);
