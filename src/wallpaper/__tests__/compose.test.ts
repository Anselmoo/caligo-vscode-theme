import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCENES } from "../../../scripts/wallpaper-scenes.js";
import { composeSeedWallpaper, SEED_SCENES } from "../compose.js";
import { toSvgDocument } from "../composer.js";
import { MODE_COMPOSERS } from "../modes/index.js";
import { eclipseMotif } from "../motifs/eclipse.js";
import { labelLines } from "../renderer.js";
import type { BrickParams, WallpaperColors } from "../types.js";
import { PLATFORM_SIZES } from "../types.js";

const SEEDS_DIR = join(__dirname, "..", "..", "seeds");
const shippedSeedIds = readdirSync(SEEDS_DIR)
  .filter(f => f.endsWith(".json"))
  .map(f => f.replace(/\.json$/, ""))
  .sort();

/** composeAuroraRefined → auroraRefinedMotif */
const motifNameFor = (exportName: string) => {
  const stem = exportName.replace(/^compose/, "");
  return `${stem[0].toLowerCase()}${stem.slice(1)}Motif`;
};

describe("SEED_SCENES registry", () => {
  it("has an explicit scene for every shipped seed (no silent fallback)", () => {
    expect(shippedSeedIds.length).toBe(10);
    for (const id of shippedSeedIds) expect(SEED_SCENES, id).toHaveProperty(id);
    expect(Object.keys(SEED_SCENES).sort()).toEqual(shippedSeedIds);
  });

  it("maps each seed to the same scene file as scripts/wallpaper-scenes.ts", () => {
    expect(SCENES.map(s => s.seed).sort()).toEqual(shippedSeedIds);
    for (const scene of SCENES) {
      expect(SEED_SCENES[scene.seed].name, scene.seed).toBe(motifNameFor(scene.exportName));
    }
  });

  it("registers the bare motif, so the renderer applies the mode exactly once", () => {
    // The scene files' compose<X> wrappers already apply MODE_COMPOSERS; the
    // renderer applies it again after composeSeedWallpaper. Registering a
    // wrapper would double the overlay, so no registry entry may be one.
    for (const fn of Object.values(SEED_SCENES)) expect(fn.name).toMatch(/Motif$/);
  });
});

describe("composeSeedWallpaper", () => {
  // Fixture palette: the scene only reads p.colors, so any valid colours do.
  const colors: WallpaperColors = {
    bg: "#0b0c10",
    bgSoft: "#10121a",
    bgMid: "#1a1c26",
    accent: "#5eb3f6",
    accentSoft: "#4a9fe0",
    accentMuted: "#2a6fa8",
    hueRed: "#e06c75",
    hueOrange: "#d19a66",
    hueYellow: "#e5c07b",
    hueGreen: "#98c379",
    hueCyan: "#56b6c2",
    hueBlue: "#61afef",
    huePurple: "#c678dd",
    strings: "#98c379",
    keywords: "#c678dd",
    functions: "#61afef",
    types: "#56b6c2",
    variables: "#e06c75",
    constants: "#e5c07b",
    numbers: "#d19a66",
    tags: "#e06c75",
    attributes: "#d19a66",
  };
  const params: BrickParams = {
    viewBox: PLATFORM_SIZES.mobile,
    colors,
    seedId: "Eclipse",
    harmonyMode: "triadic",
    platform: "mobile",
  };

  it("returns the seed's bare scene, without the mode overlay", () => {
    const viaRegistry = toSvgDocument(composeSeedWallpaper(params), params.viewBox);
    expect(viaRegistry).toBe(toSvgDocument(eclipseMotif(params), params.viewBox));
    const withMode = toSvgDocument(
      MODE_COMPOSERS.triadic(composeSeedWallpaper(params), params),
      params.viewBox
    );
    expect(withMode).not.toBe(viaRegistry);
  }, 60_000);
});

describe("labelLines", () => {
  const spec = { seedDisplayName: "Midnight Atelier", harmonyMode: "split-complementary" };

  it("keeps seed and topic on the large line on landscape canvases", () => {
    expect(labelLines(spec, PLATFORM_SIZES.monitor)).toEqual({
      line1: "Caligo",
      line2: "Midnight Atelier · Split Complementary",
    });
    expect(labelLines(spec, PLATFORM_SIZES.tablet).line2).toBe(
      "Midnight Atelier · Split Complementary"
    );
  });

  it("moves the seed name to the small line on the portrait mobile canvas", () => {
    expect(labelLines(spec, PLATFORM_SIZES.mobile)).toEqual({
      line1: "Caligo · Midnight Atelier",
      line2: "Split Complementary",
    });
  });
});
