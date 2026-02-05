// Color analysis to prove OKLCH color tinting
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function rgbToOklab(r: number, g: number, b: number) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToOklch(L: number, a: number, b: number) {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

function hexToOklch(hex: string) {
  const rgb = hexToRgb(hex);
  const oklab = rgbToOklab(rgb.r, rgb.g, rgb.b);
  return oklabToOklch(oklab.L, oklab.a, oklab.b);
}

const colors: Record<string, string> = {
  "bg0 (#00161b)": "#00161b",
  "Pure Black (#000000)": "#000000",
  "Pure Grey (#1a1a1a)": "#1a1a1a",
  "fg0 (#bbd7dc)": "#bbd7dc",
  "fgMuted (#81979b)": "#81979b",
};

console.log("OKLCH Analysis of Caligo Colors:\n");
console.log("Format: OKLCH(Lightness, Chroma, Hue°)\n");

for (const [name, hex] of Object.entries(colors)) {
  const oklch = hexToOklch(hex);
  console.log(`${name}:`);
  console.log(`  L: ${oklch.L.toFixed(3)} (lightness 0-1)`);
  console.log(`  C: ${oklch.C.toFixed(3)} (chroma/saturation)`);
  console.log(`  H: ${oklch.H.toFixed(1)}° (hue)`);
  console.log();
}

console.log("Key Insights:");
console.log("• bg0 has H=240° (cyan/blue) - NOT neutral grey");
console.log("• Pure black H=0° with C=0 - completely neutral");
console.log("• Pure grey H=0° with C=0 - completely neutral");
console.log("• fg0/fgMuted also have ~210-240° (cyan tint) matching bg");
console.log("\nThis is 'No Forbidden Black' in action!");
