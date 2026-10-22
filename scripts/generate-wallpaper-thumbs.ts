/**
 * generate-wallpaper-thumbs.ts
 *
 * Rasterises every generated wallpaper SVG to a small WebP thumbnail for the
 * gallery grid.
 *
 * Why this exists: the wallpaper SVGs are authored at full wallpaper resolution
 * (up to 3840×2160) with tens of thousands of nodes — one is 2.1 MB with 8,747
 * <path> elements. The gallery renders them into ~300 px cards, so a 50-card
 * grid used to pull 4.4 MB gzipped / 22 MB of XML and rasterise ~51,000 paths
 * that are far too small to resolve. A 640 px WebP is ~30 KB and costs the
 * browser nothing to decode.
 *
 * Output lives beside each SVG: monitor.svg → monitor.webp. Thumbnails are
 * generated in CI and never committed; `generate-wallpapers-manifest.ts` only
 * advertises a thumbPath for files that actually exist.
 *
 * Usage:
 *   npx tsx scripts/generate-wallpaper-thumbs.ts [--quality=0.8] [--seed=<id>]
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { matchesSeed, parseQuality, platformFromPath } from "../src/wallpaper/thumbs.js";
import { HERO_LONG_EDGE, THUMBNAIL_LONG_EDGE, thumbnailSize } from "../src/wallpaper/types.js";

// ─── Paths ────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const WALLPAPERS_DIR = join(PROJECT_ROOT, "public", "wallpapers");

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const QUALITY = parseQuality(args.find(a => a.startsWith("--quality="))?.split("=")[1]);
const FILTER_SEED = args.find(a => a.startsWith("--seed="))?.split("=")[1];

// ─── Discovery ────────────────────────────────────────────────────────────────

/** Every .svg under public/wallpapers, as absolute paths. */
function collectSvgs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSvgs(full, out);
    else if (entry.name.endsWith(".svg")) out.push(full);
  }
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🖼  Caligo Wallpaper Thumbnails");
  console.log("─".repeat(50));

  if (!existsSync(WALLPAPERS_DIR)) {
    console.warn("⚠️  public/wallpapers/ not found — nothing to rasterise.");
    console.warn("   Run `npm run wallpapers:generate:svg-only` first.");
    process.exit(0);
  }

  let svgs = collectSvgs(WALLPAPERS_DIR).sort();
  if (FILTER_SEED) {
    svgs = svgs.filter(f => matchesSeed(f, FILTER_SEED));
  }

  if (svgs.length === 0) {
    console.warn("⚠️  No wallpaper SVGs found — nothing to rasterise.");
    process.exit(0);
  }

  console.log(`  Rasterising ${svgs.length} thumbnails at ${THUMBNAIL_LONG_EDGE}px long edge…`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let written = 0;
  let bytes = 0;

  try {
    for (const svgFile of svgs) {
      const platform = platformFromPath(svgFile);
      const { width, height } = thumbnailSize(platform);
      // The monitor scene without caption also feeds the site hero: rasterise it
      // once at hero size and downscale that canvas for the thumbnail.
      const hero = svgFile.endsWith(`${sep}monitor.svg`)
        ? thumbnailSize(platform, HERO_LONG_EDGE)
        : null;
      const svgText = readFileSync(svgFile, "utf-8");

      // Draw the SVG into a canvas and let Chromium encode WebP. Doing it in-page
      // avoids a second image dependency (Playwright itself screenshots only
      // PNG/JPEG) and matches how browsers will rasterise the artwork for real users.
      const urls: { thumb: string; hero: string | null } = await page.evaluate(
        async ({ svg, w, h, hw, hh, q }) => {
          const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          // No named helpers in here: tsx wraps them in a __name() call that does
          // not exist inside the page.
          try {
            const img = new Image();
            img.src = url;
            await img.decode();
            const sizes =
              hw && hh
                ? [
                    [hw, hh],
                    [w, h],
                  ]
                : [[w, h]];
            const out: string[] = [];
            let source: CanvasImageSource = img;
            for (const [cw, ch] of sizes) {
              const canvas = document.createElement("canvas");
              canvas.width = cw;
              canvas.height = ch;
              const ctx = canvas.getContext("2d");
              if (!ctx) throw new Error("Canvas 2D context unavailable");
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(source, 0, 0, cw, ch);
              out.push(canvas.toDataURL("image/webp", q));
              source = canvas;
            }
            return out.length === 2
              ? { hero: out[0], thumb: out[1] }
              : { hero: null, thumb: out[0] };
          } finally {
            URL.revokeObjectURL(url);
          }
        },
        {
          svg: svgText,
          w: width,
          h: height,
          hw: hero?.width ?? 0,
          hh: hero?.height ?? 0,
          q: QUALITY,
        }
      );

      const outputs: Array<[string, string]> = [[svgFile.replace(/\.svg$/, ".webp"), urls.thumb]];
      if (urls.hero) outputs.push([svgFile.replace(/\.svg$/, ".hero.webp"), urls.hero]);
      for (const [outFile, dataUrl] of outputs) {
        if (!dataUrl.startsWith("data:image/webp")) {
          throw new Error(`Chromium did not return WebP for ${relative(PROJECT_ROOT, outFile)}`);
        }
        const buffer = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
        writeFileSync(outFile, buffer);
        bytes += statSync(outFile).size;
      }

      written++;

      if (written % 50 === 0) console.log(`  … ${written}/${svgs.length}`);
    }
  } finally {
    await browser.close();
  }

  const avgKb = Math.round(bytes / written / 1024);
  console.log(
    `  ✅ ${written} thumbnails written (${(bytes / 1048576).toFixed(1)} MB total, ~${avgKb} KB each)`
  );
  console.log("\n✅ Thumbnail generation complete.");
}

main().catch(err => {
  console.error("❌ Thumbnail generation failed:", err);
  process.exit(1);
});
