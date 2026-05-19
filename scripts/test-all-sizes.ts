import { derivePalette } from "../src/lib/palette.js";
import { expandSeedVariants, loadAllSeeds } from "../src/lib/seeds.js";
import { renderWallpaperSvg } from "../src/wallpaper/renderer.js";
import type { WallpaperSpec } from "../src/wallpaper/types.js";

type ThemeMode = "Balanced" | "Analogous" | "Monochromatic" | "Triadic" | "SplitComplementary";
const HARMONY_TO_THEME_MODE: Record<string, ThemeMode> = {
  none: "Balanced",
  analogous: "Analogous",
  monochromatic: "Monochromatic",
  triadic: "Triadic",
  "split-complementary": "SplitComplementary",
};

async function main() {
  const seeds = await loadAllSeeds();

  for (const seed of seeds) {
    const variants = expandSeedVariants(seed);
    for (const variant of variants) {
      const harmonyMode = variant.harmony ?? "none";
      const themeMode = HARMONY_TO_THEME_MODE[harmonyMode] ?? "Balanced";
      const palette = derivePalette(variant, themeMode);

      const spec: WallpaperSpec = {
        seedId: seed.id,
        seedDisplayName: seed.displayName,
        harmonyMode,
        topic: "Core",
        platform: "monitor",
        textVariant: "no-text",
        displayName: `${seed.displayName} · Core`,
      };

      try {
        const svg = renderWallpaperSvg({ palette, spec });
        const sizeKB = (svg.length / 1024).toFixed(1);
        console.log(`${seed.id}/${harmonyMode}: ${sizeKB} KB`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`${seed.id}/${harmonyMode}: ERROR - ${msg.slice(0, 100)}`);
      }
    }
  }
}

main().catch(console.error);
