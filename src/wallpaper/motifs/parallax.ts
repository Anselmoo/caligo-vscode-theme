/**
 * Parallax motif — layered shapes at different blur depths creating faux bokeh.
 * Like out-of-focus city lights or camera lens bokeh effect.
 */
import { backgroundBrick, nebulaGlowBrick, noiseBrick, vignetteBrick } from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "../types.js";

function bokehLayer(
  p: BrickParams,
  opts: {
    id: string;
    count: number;
    minR: number;
    maxR: number;
    blur: number;
    color: string;
    opacity: number;
  }
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = p;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  let s = 0x811c9dc5;
  const str = `${seedId}-${harmonyMode}-${opts.id}`;
  for (let i = 0; i < str.length; i++) {
    s ^= str.charCodeAt(i);
    s = Math.imul(s, 0x01000193) >>> 0;
  }
  const rng = () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };

  const filterId = `${opts.id}-blur`;
  const defs = `<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${((opts.blur * scale) / 2160).toFixed(1)}"/></filter>`;

  const circles: string[] = [];
  for (let i = 0; i < opts.count; i++) {
    const cx = (rng() * width).toFixed(1);
    const cy = (rng() * height).toFixed(1);
    const r = ((opts.minR + rng() * (opts.maxR - opts.minR)) * scale).toFixed(1);
    const a = (opts.opacity * (0.3 + rng() * 0.7)).toFixed(3);
    circles.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${opts.color}" opacity="${a}"/>`);
  }

  return {
    defs,
    elements: `<g id="${opts.id}" filter="url(#${filterId})">${circles.join("")}</g>`,
  };
}

export function parallax(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return parallaxDrift(params);
    case "split-complementary":
      return parallaxBreak(params);
    case "monochromatic":
      return parallaxVoid(params);
    case "triadic":
      return parallaxPulse(params);
    default:
      return parallaxStillness(params);
  }
}

function parallaxStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const far = bokehLayer(p, {
    id: "px-s-far",
    count: 8,
    minR: 0.02,
    maxR: 0.04,
    blur: 20,
    color: colors.accentMuted,
    opacity: 0.06,
  });
  const mid = bokehLayer(p, {
    id: "px-s-mid",
    count: 12,
    minR: 0.008,
    maxR: 0.02,
    blur: 10,
    color: colors.accentSoft,
    opacity: 0.1,
  });
  const near = bokehLayer(p, {
    id: "px-s-near",
    count: 20,
    minR: 0.003,
    maxR: 0.008,
    blur: 4,
    color: colors.accent,
    opacity: 0.15,
  });

  const glow = nebulaGlowBrick(p, {
    id: "px-s-glow",
    blobs: [{ cx: 0.5, cy: 0.5, rx: 0.15, ry: 0.12, color: colors.accent, opacity: 0.07 }],
    blur: 90,
  });

  const vig = vignetteBrick(p, { id: "px-s-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "px-s-n", opacity: 0.04 });
  return mergeBricks([bg, glow, far, mid, near, vig, noise]);
}

function parallaxDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const far = bokehLayer(p, {
    id: "px-d-far",
    count: 6,
    minR: 0.025,
    maxR: 0.045,
    blur: 22,
    color: colors.accentMuted,
    opacity: 0.05,
  });
  const mid = bokehLayer(p, {
    id: "px-d-mid",
    count: 10,
    minR: 0.01,
    maxR: 0.022,
    blur: 12,
    color: colors.accentSoft,
    opacity: 0.08,
  });
  const near = bokehLayer(p, {
    id: "px-d-near",
    count: 18,
    minR: 0.004,
    maxR: 0.01,
    blur: 5,
    color: colors.accent,
    opacity: 0.14,
  });

  const glow = nebulaGlowBrick(p, {
    id: "px-d-glow",
    blobs: [{ cx: 0.4, cy: 0.45, rx: 0.15, ry: 0.1, color: colors.accent, opacity: 0.06 }],
    blur: 80,
  });

  const glowWarm = nebulaGlowBrick(p, {
    id: "px-d-gw",
    blobs: [{ cx: 0.6, cy: 0.55, rx: 0.1, ry: 0.08, color: colors.hueOrange, opacity: 0.04 }],
    blur: 80,
  });

  const vig = vignetteBrick(p, { id: "px-d-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "px-d-n", opacity: 0.04 });
  return mergeBricks([bg, glow, glowWarm, far, mid, near, vig, noise]);
}

function parallaxBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const far1 = bokehLayer(p, {
    id: "px-b-f1",
    count: 5,
    minR: 0.02,
    maxR: 0.04,
    blur: 18,
    color: colors.accentMuted,
    opacity: 0.05,
  });
  const mid1 = bokehLayer(p, {
    id: "px-b-m1",
    count: 8,
    minR: 0.008,
    maxR: 0.018,
    blur: 10,
    color: colors.accent,
    opacity: 0.1,
  });
  const mid2 = bokehLayer(p, {
    id: "px-b-m2",
    count: 8,
    minR: 0.008,
    maxR: 0.018,
    blur: 10,
    color: colors.hueBlue,
    opacity: 0.08,
  });
  const near = bokehLayer(p, {
    id: "px-b-near",
    count: 15,
    minR: 0.003,
    maxR: 0.007,
    blur: 4,
    color: colors.accentSoft,
    opacity: 0.12,
  });

  const g1 = nebulaGlowBrick(p, {
    id: "px-b-g1",
    blobs: [{ cx: 0.35, cy: 0.4, rx: 0.1, ry: 0.08, color: colors.accent, opacity: 0.07 }],
    blur: 60,
  });

  const g2 = nebulaGlowBrick(p, {
    id: "px-b-g2",
    blobs: [{ cx: 0.65, cy: 0.6, rx: 0.1, ry: 0.08, color: colors.hueBlue, opacity: 0.06 }],
    blur: 60,
  });

  const vig = vignetteBrick(p, { id: "px-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "px-b-n", opacity: 0.04 });
  return mergeBricks([bg, g1, g2, far1, mid1, mid2, near, vig, noise]);
}

function parallaxVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const far = bokehLayer(p, {
    id: "px-v-far",
    count: 4,
    minR: 0.015,
    maxR: 0.03,
    blur: 18,
    color: colors.accentMuted,
    opacity: 0.04,
  });
  const mid = bokehLayer(p, {
    id: "px-v-mid",
    count: 6,
    minR: 0.006,
    maxR: 0.012,
    blur: 8,
    color: colors.accentMuted,
    opacity: 0.06,
  });

  const vig = vignetteBrick(p, { id: "px-v-vig", opacity: 0.65 });
  const noise = noiseBrick(p, { id: "px-v-n", opacity: 0.05 });
  return mergeBricks([bg, far, mid, vig, noise]);
}

function parallaxPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const far = bokehLayer(p, {
    id: "px-p-far",
    count: 6,
    minR: 0.02,
    maxR: 0.04,
    blur: 20,
    color: colors.accentMuted,
    opacity: 0.05,
  });
  const m1 = bokehLayer(p, {
    id: "px-p-m1",
    count: 8,
    minR: 0.008,
    maxR: 0.018,
    blur: 10,
    color: colors.accent,
    opacity: 0.1,
  });
  const m2 = bokehLayer(p, {
    id: "px-p-m2",
    count: 6,
    minR: 0.008,
    maxR: 0.016,
    blur: 10,
    color: colors.hueBlue,
    opacity: 0.08,
  });
  const m3 = bokehLayer(p, {
    id: "px-p-m3",
    count: 5,
    minR: 0.006,
    maxR: 0.014,
    blur: 10,
    color: colors.huePurple,
    opacity: 0.07,
  });
  const near = bokehLayer(p, {
    id: "px-p-near",
    count: 20,
    minR: 0.003,
    maxR: 0.008,
    blur: 4,
    color: colors.accentSoft,
    opacity: 0.14,
  });

  const g1 = nebulaGlowBrick(p, {
    id: "px-p-g1",
    blobs: [{ cx: 0.3, cy: 0.35, rx: 0.08, ry: 0.08, color: colors.accent, opacity: 0.06 }],
    blur: 55,
  });

  const g2 = nebulaGlowBrick(p, {
    id: "px-p-g2",
    blobs: [{ cx: 0.6, cy: 0.5, rx: 0.08, ry: 0.08, color: colors.hueBlue, opacity: 0.05 }],
    blur: 55,
  });

  const g3 = nebulaGlowBrick(p, {
    id: "px-p-g3",
    blobs: [{ cx: 0.45, cy: 0.7, rx: 0.08, ry: 0.08, color: colors.huePurple, opacity: 0.05 }],
    blur: 55,
  });

  const vig = vignetteBrick(p, { id: "px-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "px-p-n", opacity: 0.04 });
  return mergeBricks([bg, g1, g2, g3, far, m1, m2, m3, near, vig, noise]);
}
