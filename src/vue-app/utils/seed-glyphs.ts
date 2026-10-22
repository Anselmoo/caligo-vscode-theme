/**
 * One small icon per seed palette, each a pictogram of that palette's wallpaper scene
 * (see src/wallpaper/motifs). Drawn on the same 22 x 22 grid (-11..11) and in the same
 * quiet line style as HarmonyGlyph, so a row icon and a column icon read as a pair.
 *
 * A shape is one SVG path with a role:
 *   line         the drawing, in the text colour
 *   fill         a solid mass (a rock, a disc), in the text colour
 *   accent       a line in the palette's own accent: the light in the scene
 *   accent-fill  a solid in the palette's accent
 */

export type GlyphShape = {
  d: string;
  role: "line" | "fill" | "accent" | "accent-fill";
  /** 0..1; defaults to 1. Used for far, faint layers. */
  opacity?: number;
};

/** A circle as a path, so every shape is one `d` and one role. */
function disc(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

export const SEED_GLYPHS: Record<string, GlyphShape[]> = {
  // An aurora curtain folding over the tundra: three wavering curtains and the ground.
  AuroraNoir: [
    { d: "M-6.5 5.5C-8 1-4.5-1-6-7", role: "accent" },
    { d: "M-1 5.5C-2.5 1.5 1-.5-.5-8", role: "accent" },
    { d: "M4.5 5.5C3 2 6.5.5 5-5.5", role: "accent", opacity: 0.7 },
    { d: "M-9.5 8H9.5", role: "line" },
  ],

  // A burnt forest: a flame and the sparks still rising from it.
  Cinder: [
    { d: "M0-8.5C3.5-4 5.5-1.5 5.5 2A5.5 5.5 0 0 1-5.5 2C-5.5-.5-3.5-2.5 0-8.5Z", role: "line" },
    {
      d: "M0-1.5C1.6.6 2.4 1.6 2.4 3A2.4 2.4 0 0 1-2.4 3C-2.4 1.6-1.4.4 0-1.5Z",
      role: "accent-fill",
    },
    { d: disc(6.8, -6.2, 0.8), role: "accent-fill" },
    { d: disc(-6.6, -4.4, 0.6), role: "accent-fill", opacity: 0.7 },
  ],

  // An alpine valley at first light: two peaks and the sun just behind them.
  DeepSable: [
    { d: "M-9.5 7L-4-3.5 0 3.5 4.5-6 9.5 7", role: "line" },
    { d: "M-9.5 7H9.5", role: "line", opacity: 0.5 },
    { d: disc(6.8, -6.6, 1.5), role: "accent-fill" },
  ],

  // Totality: the black disc and the corona standing around it.
  Eclipse: [
    { d: disc(0, 0, 4.4), role: "fill" },
    { d: disc(0, 0, 7.6), role: "accent" },
    { d: "M0-10.2V-9M0 9V10.2M-10.2 0H-9M9 0H10.2", role: "accent", opacity: 0.7 },
  ],

  // Ink-wash ranges in fog: three layers, fading with distance.
  GraphiteFlux: [
    { d: "M-9.5-3.5Q-6-7.5-3-4.5T2.5-4.5 9.5-3", role: "line", opacity: 0.45 },
    { d: "M-9.5.5Q-5-4-1.5-.5T5 .5 9.5 1", role: "line", opacity: 0.7 },
    { d: "M-9.5 5Q-6 1.5-2.5 4.5T4 4.5 9.5 5.5", role: "line" },
  ],

  // Moonlit dunes: two crests and a low moon.
  Mandarian: [
    { d: "M-9.5 5.5Q-4.5-1 1 4.5T9.5 3", role: "line" },
    { d: "M-9.5 9Q-3 4.5 3 8.5", role: "line", opacity: 0.5 },
    { d: disc(5.2, -5.2, 2.6), role: "accent-fill" },
  ],

  // A full moon over a lake: the moon, and its glitter path widening toward us.
  MidnightAtelier: [
    { d: disc(0, -5, 3.6), role: "accent-fill" },
    { d: "M-1.2 1.4H1.2", role: "accent" },
    { d: "M-3 4.4H3", role: "line", opacity: 0.8 },
    { d: "M-5 7.4H5", role: "line", opacity: 0.6 },
    { d: "M-7 10.4H7", role: "line", opacity: 0.4 },
  ],

  // The Milky Way: a band of light climbing out of the horizon, a few stars around it.
  NebulaNight: [
    { d: "M-8 8C-4 5 2-1 4-9", role: "line", opacity: 0.55 },
    { d: "M-3.5 9C.5 6.5 6.5.5 8-6", role: "line", opacity: 0.55 },
    { d: disc(-0.2, 1.6, 1.6), role: "accent-fill" },
    { d: disc(-6.6, -5.4, 0.7), role: "fill" },
    { d: disc(7.4, 5.4, 0.7), role: "fill" },
    { d: disc(-7.6, 0, 0.5), role: "fill", opacity: 0.7 },
  ],

  // Basalt sea stacks in dark water: three columns, the last light on the horizon.
  ObsidianGlow: [
    { d: "M-8 7V-1.5L-5.8-3.5-3.6-1.5V7", role: "line" },
    { d: "M-2.2 7V-5.5L0-8 2.2-5.5V7", role: "line" },
    { d: "M3.6 7V.2L5.8-1.8 8 .2V7", role: "line" },
    { d: "M-9.5 9.6H9.5", role: "accent" },
  ],

  // A lava planet: black towers, and the lava river running between them.
  VoidEmber: [
    { d: "M-9 7.5L-7-8.2-3.6 7.5", role: "line" },
    { d: "M3 7.5L5-5 8.4 7.5", role: "line" },
    { d: "M-3.4 8.4C-1 4.5 1 6.5 3.2 2.2", role: "accent" },
  ],
};

/** Every seed id that has an icon, in the order the Spectrum lists them. */
export const SEED_GLYPH_IDS = Object.keys(SEED_GLYPHS);
