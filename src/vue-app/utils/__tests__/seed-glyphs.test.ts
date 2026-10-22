/**
 * Every seed palette has its own icon, and no icon is empty or malformed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SeedGlyph from "../../components/theme/SeedGlyph.vue";
import { SEED_GLYPH_IDS, SEED_GLYPHS } from "../seed-glyphs.js";

const SEEDS_DIR = join(process.cwd(), "src", "seeds");
const seedIds = readdirSync(SEEDS_DIR)
  .filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(readFileSync(join(SEEDS_DIR, f), "utf8")).id as string)
  .sort();

describe("seed glyphs", () => {
  it("has exactly one icon for every seed palette", () => {
    expect([...SEED_GLYPH_IDS].sort()).toEqual(seedIds);
  });

  it("draws every icon with at least two shapes, using only known roles", () => {
    const roles = new Set(["line", "fill", "accent", "accent-fill"]);
    for (const id of SEED_GLYPH_IDS) {
      const shapes = SEED_GLYPHS[id];
      expect(shapes.length, `${id} shapes`).toBeGreaterThanOrEqual(2);
      for (const s of shapes) {
        expect(roles.has(s.role), `${id} role ${s.role}`).toBe(true);
        expect(s.d, `${id} path`).toMatch(/^M-?\d/);
        if (s.opacity !== undefined) expect(s.opacity).toBeGreaterThan(0);
      }
    }
  });

  it("starts every drawing inside its 22 x 22 grid and never makes a shape wider than it", () => {
    for (const id of SEED_GLYPH_IDS) {
      for (const s of SEED_GLYPHS[id]) {
        const [x, y] = (s.d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
        expect(Math.abs(x), `${id} start x ${s.d}`).toBeLessThanOrEqual(11);
        expect(Math.abs(y), `${id} start y ${s.d}`).toBeLessThanOrEqual(11);
        // Relative arc segments carry a diameter at most as wide as the grid.
        for (const n of (s.d.match(/-?\d*\.?\d+/g) ?? []).map(Number))
          expect(Math.abs(n), `${id} ${s.d}`).toBeLessThanOrEqual(22);
      }
    }
  });

  it("gives each icon its own drawing", () => {
    const drawings = SEED_GLYPH_IDS.map(id => SEED_GLYPHS[id].map(s => s.d).join("|"));
    expect(new Set(drawings).size).toBe(SEED_GLYPH_IDS.length);
  });
});

describe("SeedGlyph", () => {
  it("renders one path per shape and is hidden from assistive tech", () => {
    const wrapper = mount(SeedGlyph, { props: { seed: "Cinder" } });
    expect(wrapper.attributes("aria-hidden")).toBe("true");
    expect(wrapper.find("title").exists()).toBe(false);
    expect(wrapper.findAll("path")).toHaveLength(SEED_GLYPHS.Cinder.length);
  });

  it("marks lit parts as accent so the row can tint them", () => {
    const wrapper = mount(SeedGlyph, { props: { seed: "Eclipse" } });
    expect(wrapper.findAll("path.seed-glyph__accent").length).toBeGreaterThan(0);
  });

  it("falls back to a plain ring for an unknown seed", () => {
    const wrapper = mount(SeedGlyph, { props: { seed: "Nope" } });
    expect(wrapper.find("circle.seed-glyph__ring").exists()).toBe(true);
    expect(wrapper.findAll("path")).toHaveLength(0);
  });
});
