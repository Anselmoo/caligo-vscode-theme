/* eslint-disable no-magic-numbers */
// Contrast + OKLCH report (fish-friendly: run with `node scripts/contrast-report.mjs`)
//
// Purpose:
// - Produce reproducible contrast ratios (WCAG) for reference themes
// - Convert hex <-> OKLCH via culori
// - Propose Caligo seed candidates (bg/fg/accent) in hex + OKLCH
//
// Notes:
// - The "primer/github-vscode-theme" repo ignores /themes output; theme JSON is generated.
// - Classic "colors.json" is a palette; contrast depends on how generator maps palette -> UI keys.

import { converter, formatHex, oklch } from "culori";

const toOklch = converter("oklch");

function srgbToLinByte(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relLum(hex) {
  const h = hex.replace("#", "").toLowerCase();
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const R = srgbToLinByte(r);
  const G = srgbToLinByte(g);
  const B = srgbToLinByte(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(fgHex, bgHex) {
  const L1 = relLum(fgHex);
  const L2 = relLum(bgHex);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function fmtOklchFromHex(hex) {
  const c = toOklch(hex);
  return `oklch(${c.l.toFixed(4)} ${c.c.toFixed(4)} ${c.h.toFixed(1)})`;
}

function toHexFromOklch(l, c, h) {
  return formatHex(oklch({ l, c, h }));
}

function printPair({ name, bg, fg, source }) {
  const cr = contrastRatio(fg, bg);
  console.log(`${name}`);
  if (source) console.log(`  source: ${source}`);
  console.log(`  bg: ${bg}  ${fmtOklchFromHex(bg)}`);
  console.log(`  fg: ${fg}  ${fmtOklchFromHex(fg)}`);
  console.log(`  contrast (fg on bg): ${cr.toFixed(2)}:1`);
}

console.log("# Reference editor FG/BG contrast\n");

printPair({
  name: "Dracula (VS Code)",
  bg: "#282A36",
  fg: "#F8F8F2",
  source: "dracula.yml: editor.background=*BG (#282A36), editor.foreground=*FG (#F8F8F2)",
});

printPair({
  name: "GitHub Dark (classic / legacy)",
  bg: "#24292e",
  fg: "#e1e4e8",
  source:
    "primer/github-vscode-theme classic generator: colors.json gray[] reversed for dark; theme.js uses editor.background=gray[0], editor.foreground=gray[7] => #24292e / #e1e4e8",
});

printPair({
  name: "GitHub Dark Default (modern)",
  bg: "#0d1117",
  fg: "#e6edf3",
  source:
    "@primer/primitives dark.json canvas.default=#0d1117; src/colors.js overrides fg.default=#e6edf3",
});

printPair({
  name: "GitHub Dark Dimmed (modern)",
  bg: "#22272e",
  fg: "#adbac7",
  source: "@primer/primitives dark_dimmed.json canvas.default=#22272e; fg.default=#adbac7",
});

printPair({
  name: "GitHub Dark High Contrast (modern)",
  bg: "#0a0c10",
  fg: "#f0f3f6",
  source: "@primer/primitives dark_high_contrast.json canvas.default=#0a0c10; fg.default=#f0f3f6",
});

console.log("\n# Caligo seed candidates (constraints-aware)\n");
console.log(
  "Constraints we honor here: background OKLCH L in [0.14, 0.22], accent OKLCH C >= 0.12.\n"
);

const caligo = [
  {
    name: "Aurora Noir",
    bg: { l: 0.18, c: 0.03, h: 290 },
    fg: { l: 0.85, c: 0.024, h: 260 },
    accent: { l: 0.7, c: 0.165, h: 165 },
  },
  {
    name: "Cinder",
    bg: { l: 0.17, c: 0.028, h: 35 },
    fg: { l: 0.85, c: 0.022, h: 45 },
    accent: { l: 0.68, c: 0.17, h: 40 },
  },
  {
    name: "Deep Sable",
    bg: { l: 0.175, c: 0.03, h: 225 },
    fg: { l: 0.85, c: 0.024, h: 240 },
    accent: { l: 0.7, c: 0.15, h: 215 },
  },
  {
    name: "Eclipse",
    bg: { l: 0.165, c: 0.032, h: 260 },
    fg: { l: 0.85, c: 0.024, h: 255 },
    accent: { l: 0.69, c: 0.16, h: 285 },
  },
  {
    name: "Graphite Flux",
    bg: { l: 0.185, c: 0.02, h: 255 },
    fg: { l: 0.85, c: 0.02, h: 255 },
    accent: { l: 0.69, c: 0.15, h: 200 },
  },
  {
    name: "Mandarian",
    bg: { l: 0.19, c: 0.03, h: 55 },
    fg: { l: 0.85, c: 0.022, h: 60 },
    accent: { l: 0.7, c: 0.175, h: 60 },
  },
  {
    name: "Midnight Atelier",
    bg: { l: 0.18, c: 0.034, h: 240 },
    fg: { l: 0.85, c: 0.024, h: 245 },
    accent: { l: 0.7, c: 0.16, h: 325 },
  },
  {
    name: "Obsidian Glow",
    bg: { l: 0.17, c: 0.028, h: 200 },
    fg: { l: 0.85, c: 0.024, h: 220 },
    accent: { l: 0.7, c: 0.155, h: 180 },
  },
  {
    name: "Void Ember",
    bg: { l: 0.16, c: 0.028, h: 20 },
    fg: { l: 0.85, c: 0.022, h: 30 },
    accent: { l: 0.67, c: 0.175, h: 25 },
  },
  {
    name: "Nebula Night",
    bg: { l: 0.18, c: 0.034, h: 275 },
    fg: { l: 0.85, c: 0.024, h: 260 },
    accent: { l: 0.7, c: 0.15, h: 210 },
  },
];

for (const t of caligo) {
  const bgHex = toHexFromOklch(t.bg.l, t.bg.c, t.bg.h);
  const fgHex = toHexFromOklch(t.fg.l, t.fg.c, t.fg.h);
  const acHex = toHexFromOklch(t.accent.l, t.accent.c, t.accent.h);
  const cr = contrastRatio(fgHex, bgHex);

  console.log(t.name);
  console.log(`  bg:     ${bgHex}  oklch(${t.bg.l} ${t.bg.c} ${t.bg.h})`);
  console.log(
    `  fg:     ${fgHex}  oklch(${t.fg.l} ${t.fg.c} ${t.fg.h})  contrast=${cr.toFixed(2)}:1`
  );
  console.log(`  accent: ${acHex}  oklch(${t.accent.l} ${t.accent.c} ${t.accent.h})`);
}
