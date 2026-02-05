import { formatHex, oklch } from "culori";

const colors = [
  { name: "VoidEmber", l: 0.68, c: 0.18, h: 10 },
  { name: "Cinder", l: 0.7, c: 0.18, h: 35 },
  { name: "Mandarian", l: 0.7, c: 0.18, h: 55 },
  { name: "AuroraNoir", l: 0.72, c: 0.18, h: 160 },
  { name: "GraphiteFlux", l: 0.7, c: 0.18, h: 175 },
  { name: "ObsidianGlow", l: 0.74, c: 0.18, h: 195 },
  { name: "Eclipse", l: 0.7, c: 0.15, h: 215 },
  { name: "DeepSable", l: 0.68, c: 0.16, h: 250 },
  { name: "NebulaNight", l: 0.72, c: 0.18, h: 285 },
  { name: "MidnightAtelier", l: 0.7, c: 0.18, h: 320 },
];

colors.forEach(c => {
  const hex = formatHex(oklch({ mode: "oklch", l: c.l, c: c.c, h: c.h }));
  console.log(`${c.name}: ${hex} (h=${c.h})`);
});
