<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from "vue";
import { useThemeAnalysis } from "../../composables/useThemeAnalysis.js";

const { oklchColors, harmonyMode } = useThemeAnalysis();

// Canvas refs
const mainCanvas = ref<HTMLCanvasElement>();
const chromaLightnessCanvas = ref<HTMLCanvasElement>();
const hueStripCanvas = ref<HTMLCanvasElement>();
const chromaHueSliceCanvases = ref<Array<HTMLCanvasElement | null>>([]);
const hueLightnessSliceCanvases = ref<Array<HTMLCanvasElement | null>>([]);
const chromaLightnessSliceCanvases = ref<Array<HTMLCanvasElement | null>>([]);

const canvasSize = 780;
const subplotSize = 780; // Full width to match wheel
const stripHeight = 64;
const miniSliceSize = 160;

// Interactive state
const selectedColor = ref<{ hex: string; l: number; c: number; h: number } | null>(null);

// Cached hit targets for selecting colors on the main wheel
const mainWheelHitTargets = ref<
  Array<{ x: number; y: number; color: { hex: string; l: number; c: number; h: number } }>
>([]);

// Primary “analysis palette”: accent + 4 syntax roles, matching the reference screenshot (5 colors).
const analysisColors = computed(() => {
  const colors = oklchColors.value;
  const preferredKeys = [
    "accent",
    "keywords",
    "functions",
    "types",
    "strings",
    "decorator",
  ] as const;

  const byKey = new Map(colors.map(c => [c.key, c] as const));
  const picked = preferredKeys.map(k => byKey.get(k)).filter(Boolean);
  if (picked.length === preferredKeys.length) {
    return picked as typeof colors;
  }

  // Fallback: show the 6 most saturated colors.
  return colors
    .slice()
    .sort((a, b) => (b.c || 0) - (a.c || 0))
    .slice(0, preferredKeys.length);
});

// Compute base hue from theme colors (average hue weighted by chroma)
const baseHue = computed(() => {
  if (analysisColors.value.length === 0) return 0;

  let totalWeight = 0;
  let weightedHueSum = 0;

  analysisColors.value.forEach(color => {
    const weight = color.c || 0.1; // Weight by chroma
    totalWeight += weight;
    weightedHueSum += (color.h || 0) * weight;
  });

  return totalWeight > 0 ? weightedHueSum / totalWeight : 0;
});

const averageChroma = computed(() => {
  if (!analysisColors.value.length) return 0;
  return analysisColors.value.reduce((sum, c) => sum + (c.c || 0), 0) / analysisColors.value.length;
});

const chromaCeiling = computed(() => {
  const maxC = analysisColors.value.reduce((m, c) => Math.max(m, c.c || 0), 0.1);
  // add a small headroom to avoid maxed-out bars, clamp to perceptual max
  return clamp(maxC + 0.05, 0.18, 0.4);
});

const selectedTextOnColor = computed(() => {
  const c = selectedColor.value;
  const bg0 = getCSSCustomProperty("--bg0");
  const fg0 = getCSSCustomProperty("--fg0");
  if (!c) return fg0;
  // Heuristic: if the swatch is bright, use dark theme background for text; otherwise use theme foreground.
  return c.l > 0.58 ? bg0 : fg0;
});

// Used in template styles; some TS configs don't account for template usage when checking noUnusedLocals.
void selectedTextOnColor;

// Get CSS custom property value
function getCSSCustomProperty(property: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
}

function rgbaFromCssRgbVar(rgbVar: string, alpha: number): string {
  const raw = getCSSCustomProperty(rgbVar);
  const rgb = raw.length ? raw : "0, 0, 0";
  return `rgba(${rgb}, ${alpha})`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function rgbToCss(rgb: { r: number; g: number; b: number }, alpha = 1): string {
  const r = Math.round(clamp(rgb.r, 0, 1) * 255);
  const g = Math.round(clamp(rgb.g, 0, 1) * 255);
  const b = Math.round(clamp(rgb.b, 0, 1) * 255);
  if (alpha >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeHueConicGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  l: number,
  c: number,
  stepDegrees = 8,
  offsetHue = 0
): CanvasGradient {
  // Conic gradients are supported by modern browsers; this powers the clean “two cycles” look.
  const grad = ctx.createConicGradient(-Math.PI / 2, cx, cy);
  for (let deg = 0; deg <= 360; deg += stepDegrees) {
    const t = deg / 360;
    const hue = (deg + offsetHue) % 360;
    const rgb = oklchToRgb({ l, c, h: hue });
    grad.addColorStop(t, rgbToCss(rgb));
  }
  return grad;
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  thickness: number,
  stroke: string | CanvasGradient,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRadialTick(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angleRad: number,
  radius: number,
  length: number,
  color: string,
  outline: string,
  width = 3
): void {
  const r0 = radius - length / 2;
  const r1 = radius + length / 2;
  const x0 = cx + r0 * Math.cos(angleRad);
  const y0 = cy + r0 * Math.sin(angleRad);
  const x1 = cx + r1 * Math.cos(angleRad);
  const y1 = cy + r1 * Math.sin(angleRad);

  // Outline for contrast on complex backgrounds
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = outline;
  ctx.lineWidth = width + 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function renderMainWheel() {
  if (!mainCanvas.value) return;

  const ctx = mainCanvas.value.getContext("2d");
  if (!ctx) return;

  // Theme-aware colors
  const borderColor = getCSSCustomProperty("--bg2");
  const outlineColor = rgbaFromCssRgbVar("--fg0-rgb", 0.85);
  const accentColor = getCSSCustomProperty("--accent");

  // Transparent background so the global aurora/stars show through
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const maxRadius = canvasSize * 0.42;
  const ringOuterRadius = maxRadius;
  const ringInnerRadius = maxRadius * 0.72;
  const ringThickness = maxRadius * 0.1;

  // Two hue rings (“two cycles”)
  // Slightly different chroma per ring to read as two separate cycles.
  const outerRingGradient = makeHueConicGradient(ctx, cx, cy, 0.7, 0.18, 8, baseHue.value);
  const innerRingGradient = makeHueConicGradient(ctx, cx, cy, 0.72, 0.1, 8, baseHue.value + 30);
  drawRing(ctx, cx, cy, ringOuterRadius, ringThickness, outerRingGradient, 0.9);
  drawRing(ctx, cx, cy, ringInnerRadius, ringThickness, innerRingGradient, 0.85);

  // Subtle boundary strokes (keeps the rings crisp on busy backgrounds)
  drawRing(ctx, cx, cy, ringOuterRadius + ringThickness / 2, 1, borderColor, 0.55);
  drawRing(ctx, cx, cy, ringOuterRadius - ringThickness / 2, 1, borderColor, 0.55);
  drawRing(ctx, cx, cy, ringInnerRadius + ringThickness / 2, 1, borderColor, 0.45);
  drawRing(ctx, cx, cy, ringInnerRadius - ringThickness / 2, 1, borderColor, 0.45);

  // Average chroma radius guide
  const maxChroma = chromaCeiling.value;
  const avgRadius =
    ringInnerRadius +
    clamp(averageChroma.value / maxChroma, 0, 1) * (ringOuterRadius - ringInnerRadius);
  drawRing(ctx, cx, cy, avgRadius, 2, rgbaFromCssRgbVar("--fg0-rgb", 0.3), 0.35);

  // Plot theme colors as tiny radial ticks (no “angle” guides, no filled disk)
  const targets: Array<{
    x: number;
    y: number;
    color: { hex: string; l: number; c: number; h: number };
  }> = [];
  analysisColors.value.forEach(color => {
    const hueDeg = color.h ?? 0;
    const angle = (hueDeg * Math.PI) / 180;
    const chromaNorm = clamp((color.c ?? 0) / maxChroma, 0, 1);

    // Place tick between inner and outer cycle based on chroma
    const tickRadius = ringInnerRadius + chromaNorm * (ringOuterRadius - ringInnerRadius);
    const tickLength = selectedColor.value?.hex === color.hex ? 18 : 12;
    const tickWidth = selectedColor.value?.hex === color.hex ? 4 : 3;

    drawRadialTick(ctx, cx, cy, angle, tickRadius, tickLength, color.hex, outlineColor, tickWidth);

    // Optional selection halo
    if (selectedColor.value?.hex === color.hex) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        cx + tickRadius * Math.cos(angle),
        cy + tickRadius * Math.sin(angle),
        10,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = accentColor;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    targets.push({
      x: cx + tickRadius * Math.cos(angle),
      y: cy + tickRadius * Math.sin(angle),
      color: { hex: color.hex, l: color.l ?? 0, c: color.c ?? 0, h: color.h ?? 0 },
    });
  });
  mainWheelHitTargets.value = targets;

  // Center dot: subtle anchor, not an “angle” indicator
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = rgbaFromCssRgbVar("--fg0-rgb", 0.6);
  ctx.fill();
  ctx.restore();
}

function renderChromaLightnessSubplot() {
  if (!chromaLightnessCanvas.value) return;

  const ctx = chromaLightnessCanvas.value.getContext("2d");
  if (!ctx) return;

  // Transparent canvas background (lets aurora/stars show through)
  const gridColor = getCSSCustomProperty("--bg2");
  const textColor = getCSSCustomProperty("--fg1");
  const accentColor = getCSSCustomProperty("--accent");

  ctx.clearRect(0, 0, subplotSize, subplotSize);

  // Draw perceptual grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);

  // Vertical lightness grid lines (0-100%)
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * (subplotSize - 20) + 10;
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x, subplotSize - 30);
    ctx.stroke();
  }

  // Horizontal chroma grid lines (0-maxChroma)
  for (let i = 0; i <= 8; i++) {
    const y = subplotSize - 30 - (i / 8) * (subplotSize - 40);
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(subplotSize - 10, y);
    ctx.stroke();
  }

  ctx.setLineDash([]); // Reset dash pattern

  // Enhanced axes with theme awareness
  ctx.strokeStyle = `${textColor}80`;
  ctx.lineWidth = 2;

  // Lightness axis (vertical)
  ctx.beginPath();
  ctx.moveTo(30, 10);
  ctx.lineTo(30, subplotSize - 30);
  ctx.stroke();

  // Chroma axis (horizontal)
  ctx.beginPath();
  ctx.moveTo(30, subplotSize - 30);
  ctx.lineTo(subplotSize - 10, subplotSize - 30);
  ctx.stroke();

  // Plot colors in chroma-lightness space
  analysisColors.value.forEach(color => {
    const x = 30 + ((color.c || 0) / chromaCeiling.value) * (subplotSize - 40);
    const y = subplotSize - 30 - clamp(color.l || 0, 0, 1) * (subplotSize - 40);

    // Draw point with color-coded circle
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color.hex;
    ctx.fill();

    // Add selection indicator
    if (selectedColor.value?.hex === color.hex) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Add selection halo
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, 2 * Math.PI);
      ctx.strokeStyle = `${accentColor}60`;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Add subtle border for contrast
      ctx.strokeStyle = rgbaFromCssRgbVar("--fg0-rgb", 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  // Labels
  ctx.fillStyle = textColor;
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";

  // Lightness axis labels
  for (let i = 0; i <= 10; i += 2) {
    const t = i / 10;
    const y = subplotSize - 30 - t * (subplotSize - 40);
    ctx.fillText(`${Math.round(t * 100)}%`, 20, y + 3);
  }

  // Chroma axis labels
  const chromaStep = chromaCeiling.value / 4;
  for (let i = 0; i <= 4; i++) {
    const x = 30 + (i / 4) * (subplotSize - 40);
    const label = (chromaStep * i).toFixed(2);
    ctx.fillText(label, x, subplotSize - 15);
  }

  // Axis titles
  ctx.save();
  ctx.translate(8, subplotSize / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Lightness", 0, 0);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillText("Chroma", subplotSize / 2, subplotSize - 3);

  // Lightweight stats
  if (analysisColors.value.length > 1) {
    const avgL =
      analysisColors.value.reduce((sum, c) => sum + (c.l || 0), 0) / analysisColors.value.length;
    const avgC =
      analysisColors.value.reduce((sum, c) => sum + (c.c || 0), 0) / analysisColors.value.length;

    ctx.font = "10px monospace";
    ctx.fillStyle = `${textColor}CC`;
    ctx.textAlign = "left";
    ctx.fillText(`Avg L: ${(avgL * 100).toFixed(1)}%`, 35, 15);
    ctx.fillText(`Avg C: ${avgC.toFixed(2)}`, 35, 25);
  }
}

function renderHueStrip() {
  if (!hueStripCanvas.value) return;

  const ctx = hueStripCanvas.value.getContext("2d");
  if (!ctx) return;

  const accentColor = getCSSCustomProperty("--accent");
  ctx.clearRect(0, 0, subplotSize, stripHeight);

  // Hue gradient (OKLCH-based)
  const grad = ctx.createLinearGradient(10, 0, subplotSize - 10, 0);
  for (let deg = 0; deg <= 360; deg += 10) {
    const t = deg / 360;
    const rgb = oklchToRgb({ l: 0.72, c: 0.16, h: deg % 360 });
    grad.addColorStop(t, rgbToCss(rgb));
  }
  ctx.save();
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.95;
  ctx.fillRect(10, 12, subplotSize - 20, 20);
  ctx.restore();

  // Plot color hues from theme
  analysisColors.value.forEach(color => {
    const x = 10 + ((color.h || 0) / 360) * (subplotSize - 20);

    ctx.beginPath();
    ctx.arc(x, 20, 4, 0, 2 * Math.PI);
    ctx.fillStyle = color.hex;
    ctx.fill();
    ctx.strokeStyle = rgbaFromCssRgbVar("--fg0-rgb", 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();

    if (selectedColor.value?.hex === color.hex) {
      ctx.beginPath();
      ctx.arc(x, 20, 6, 0, 2 * Math.PI);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  // Base hue indicator
  const baseX = 10 + (baseHue.value / 360) * (subplotSize - 20);
  ctx.beginPath();
  ctx.arc(baseX, 22, 3, 0, 2 * Math.PI);
  ctx.fillStyle = accentColor;
  ctx.fill();
}

function oklchToRgb(oklch: { l: number; c: number; h: number }): {
  r: number;
  g: number;
  b: number;
} {
  // Convert OKLCH to OKLab
  const { l, c, h } = oklch;
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // Convert OKLab to linear RGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  // Gamma correction
  const gammaCorrect = (x: number) => {
    return x >= 0.0031308 ? 1.055 * x ** (1 / 2.4) - 0.055 : 12.92 * x;
  };

  return {
    r: Math.max(0, Math.min(1, gammaCorrect(r))),
    g: Math.max(0, Math.min(1, gammaCorrect(g))),
    b: Math.max(0, Math.min(1, gammaCorrect(bl))),
  };
}

function oklchToLinearRgb(oklch: { l: number; c: number; h: number }): {
  r: number;
  g: number;
  b: number;
} {
  const { l, c, h } = oklch;
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  };
}

function isLinearRgbInGamut(rgb: { r: number; g: number; b: number }): boolean {
  return rgb.r >= 0 && rgb.r <= 1 && rgb.g >= 0 && rgb.g <= 1 && rgb.b >= 0 && rgb.b <= 1;
}

function linearToSrgbChannel(x: number): number {
  // sRGB transfer function
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

type SliceAxis = "cl" | "ch" | "hl";

function renderSliceSet(canvases: Array<HTMLCanvasElement | null>, axis: SliceAxis) {
  const colors = analysisColors.value;
  const maxChroma = chromaCeiling.value;
  const pad = 12;
  const fg = rgbaFromCssRgbVar("--fg0-rgb", 0.25);
  const fgStrong = rgbaFromCssRgbVar("--fg0-rgb", 0.55);
  const accent = getCSSCustomProperty("--accent");

  colors.forEach((color, idx) => {
    const canvas = canvases[idx];
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, miniSliceSize, miniSliceSize);

    const w = miniSliceSize;
    const h = miniSliceSize;
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;

    const img = ctx.createImageData(w, h);
    for (let y = pad; y < h - pad; y++) {
      for (let x = pad; x < w - pad; x++) {
        let L = color.l ?? 0.7;
        let C = color.c ?? 0.18;
        let H = color.h ?? 0;

        if (axis === "cl") {
          const lt = 1 - (y - pad) / plotH;
          const ct = (x - pad) / plotW;
          L = clamp(lt, 0, 1);
          C = clamp(ct * maxChroma, 0, maxChroma);
        } else if (axis === "ch") {
          const ct = (x - pad) / plotW;
          const ht = (y - pad) / plotH;
          C = clamp(ct * maxChroma, 0, maxChroma);
          H = clamp(ht, 0, 1) * 360;
        } else {
          const ht = (x - pad) / plotW;
          const lt = 1 - (y - pad) / plotH;
          H = clamp(ht, 0, 1) * 360;
          L = clamp(lt, 0, 1);
        }

        const linear = oklchToLinearRgb({ l: L, c: C, h: H });
        if (!isLinearRgbInGamut(linear)) continue;

        const sr = clamp(linearToSrgbChannel(linear.r), 0, 1);
        const sg = clamp(linearToSrgbChannel(linear.g), 0, 1);
        const sb = clamp(linearToSrgbChannel(linear.b), 0, 1);

        const i = (y * w + x) * 4;
        img.data[i + 0] = Math.round(sr * 255);
        img.data[i + 1] = Math.round(sg * 255);
        img.data[i + 2] = Math.round(sb * 255);
        img.data[i + 3] = 220;
      }
    }

    ctx.putImageData(img, 0, 0);

    // Frame + subtle grid
    ctx.save();
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 0.5, pad + 0.5, plotW - 1, plotH - 1);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    for (let i = 1; i <= 3; i++) {
      const gx = pad + (i / 4) * plotW;
      const gy = pad + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(gx, pad);
      ctx.lineTo(gx, h - pad);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad, gy);
      ctx.lineTo(w - pad, gy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Current palette point
    let px = pad;
    let py = pad;
    if (axis === "cl") {
      px = pad + clamp((color.c || 0) / maxChroma, 0, 1) * plotW;
      py = pad + (1 - clamp(color.l || 0, 0, 1)) * plotH;
    } else if (axis === "ch") {
      px = pad + clamp((color.c || 0) / maxChroma, 0, 1) * plotW;
      py = pad + clamp((color.h || 0) / 360, 0, 1) * plotH;
    } else {
      px = pad + clamp((color.h || 0) / 360, 0, 1) * plotW;
      py = pad + (1 - clamp(color.l || 0, 0, 1)) * plotH;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = color.hex;
    ctx.fill();
    ctx.strokeStyle = fgStrong;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (selectedColor.value?.hex === color.hex) {
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  });
}

function renderAll() {
  renderMainWheel();
  renderChromaLightnessSubplot();
  renderHueStrip();
  renderSliceSet(chromaLightnessSliceCanvases.value, "cl");
  renderSliceSet(chromaHueSliceCanvases.value, "ch");
  renderSliceSet(hueLightnessSliceCanvases.value, "hl");
}

function onMainWheelPointerDown(e: PointerEvent) {
  const canvas = mainCanvas.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let best: { d: number; c: { hex: string; l: number; c: number; h: number } } | null = null;
  for (const t of mainWheelHitTargets.value) {
    const dx = t.x - x;
    const dy = t.y - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= 14 && (!best || d < best.d)) {
      best = { d, c: t.color };
    }
  }

  if (best) {
    selectedColor.value = best.c;
    requestAnimationFrame(renderAll);
  }
}

// Keep selection stable and re-render when palette changes
watchEffect(() => {
  const palette = analysisColors.value;
  if (!palette.length) {
    selectedColor.value = null;
    return;
  }

  if (!selectedColor.value || !palette.find(c => c.hex === selectedColor.value?.hex)) {
    const next = palette[0];
    selectedColor.value = { hex: next.hex, l: next.l ?? 0, c: next.c ?? 0, h: next.h ?? 0 };
  }

  requestAnimationFrame(renderAll);
});

// Explicitly watch oklchColors to force re-render on theme change
watch(
  oklchColors,
  () => {
    requestAnimationFrame(renderAll);
  },
  { deep: true }
);

watch(harmonyMode, () => {
  requestAnimationFrame(renderAll);
});

// Initialize canvases on mount
onMounted(() => {
  // Attach interaction handler
  if (mainCanvas.value) {
    mainCanvas.value.addEventListener("pointerdown", onMainWheelPointerDown);
  }
  renderAll();
});

onBeforeUnmount(() => {
  if (mainCanvas.value) {
    mainCanvas.value.removeEventListener("pointerdown", onMainWheelPointerDown);
  }
});
</script>

<template>
  <div class="polar-wheel">
    <div class="wheel-header">
      <h3>Live Theme Colors</h3>
    </div>
    
    <!-- Centered wheel at top -->
    <div class="wheel-container">
      <canvas 
        ref="mainCanvas" 
        class="wheel-canvas main-wheel"
        :width="canvasSize" 
        :height="canvasSize"
        :style="{ width: canvasSize + 'px', height: canvasSize + 'px' }"
      />
    </div>
    
    <!-- Mini-slices sections below wheel -->
    <div class="slices-container">
        <div class="subplot subplot--wide">
          <h4>Chroma × Lightness slices (6)</h4>
          <div class="mini-slices">
            <div
              v-for="(color, idx) in analysisColors"
              :key="color.key + '-cl'"
              class="mini-slice"
              :class="{ 'mini-slice--selected': selectedColor?.hex === color.hex }"
            >
              <div class="mini-slice__label">
                <span class="mini-slice__name">{{ color.label ?? color.key }}</span>
                <span class="mini-slice__chip" :style="{ background: color.hex }" />
              </div>
              <canvas
                :ref="el => (chromaLightnessSliceCanvases[idx] = el as HTMLCanvasElement | null)"
                class="mini-slice__canvas"
                :width="miniSliceSize"
                :height="miniSliceSize"
                :style="{ width: miniSliceSize + 'px', height: miniSliceSize + 'px' }"
              />
            </div>
          </div>
        </div>

        <div class="subplot subplot--wide">
          <h4>Chroma × Hue slices (6)</h4>
          <div class="mini-slices">
            <div
              v-for="(color, idx) in analysisColors"
              :key="color.key + '-ch'"
              class="mini-slice"
              :class="{ 'mini-slice--selected': selectedColor?.hex === color.hex }"
            >
              <div class="mini-slice__label">
                <span class="mini-slice__name">{{ color.label ?? color.key }}</span>
                <span class="mini-slice__chip" :style="{ background: color.hex }" />
              </div>
              <canvas
                :ref="el => (chromaHueSliceCanvases[idx] = el as HTMLCanvasElement | null)"
                class="mini-slice__canvas"
                :width="miniSliceSize"
                :height="miniSliceSize"
                :style="{ width: miniSliceSize + 'px', height: miniSliceSize + 'px' }"
              />
            </div>
          </div>
        </div>

        <div class="subplot subplot--wide">
          <h4>Hue × Lightness slices (6)</h4>
          <div class="mini-slices">
            <div
              v-for="(color, idx) in analysisColors"
              :key="color.key + '-hl'"
              class="mini-slice"
              :class="{ 'mini-slice--selected': selectedColor?.hex === color.hex }"
            >
              <div class="mini-slice__label">
                <span class="mini-slice__name">{{ color.label ?? color.key }}</span>
                <span class="mini-slice__chip" :style="{ background: color.hex }" />
              </div>
              <canvas
                :ref="el => (hueLightnessSliceCanvases[idx] = el as HTMLCanvasElement | null)"
                class="mini-slice__canvas"
                :width="miniSliceSize"
                :height="miniSliceSize"
                :style="{ width: miniSliceSize + 'px', height: miniSliceSize + 'px' }"
              />
            </div>
          </div>
        </div>
    </div>
    
    <div class="color-details" v-if="selectedColor">
      <h4>Selected Color Details</h4>
      <div class="color-info">
        <div class="color-swatch" :style="{ background: selectedColor.hex }"></div>
        <div class="color-values">
          <p><strong>Hex:</strong> {{ selectedColor.hex }}</p>
          <p><strong>OKLCH:</strong> L={{ selectedColor.l.toFixed(3) }} C={{ selectedColor.c.toFixed(3) }} H={{ selectedColor.h.toFixed(1) }}</p>
        </div>
      </div>

      <div class="live-preview">
        <div class="live-preview__card" :style="{ background: selectedColor.hex, color: selectedTextOnColor }">
          <div class="live-preview__label">As background</div>
          <div class="live-preview__sample">export const caligo = 'live';</div>
        </div>
        <div class="live-preview__card" :style="{ background: 'var(--bg0)', color: selectedColor.hex }">
          <div class="live-preview__label">As foreground</div>
          <div class="live-preview__sample">const theme = 'Caligo';</div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.polar-wheel {
  padding: var(--space-lg);
}

.wheel-header {
  margin-bottom: var(--space-lg);
}

.wheel-header h3 {
  font-size: var(--text-xl);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  /* Color from typography.css: --text-primary */
}

.wheel-header p {
  color: var(--text-primary);
  line-height: 1.6;
}

.wheel-container {
  display: flex;
  justify-content: center;
  padding: var(--space-xl);
  background: transparent;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
  border: 1px solid rgba(var(--fg0-rgb), 0.10);
  backdrop-filter: blur(10px);
}

.slices-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.main-wheel {
  flex-shrink: 0;
  justify-self: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid rgba(var(--fg0-rgb), 0.12);
  background: transparent;
}

.main-wheel:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);
}

.subplot {
  background: transparent;
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--fg0-rgb), 0.10);
  backdrop-filter: blur(10px);
}

.subplot--wide {
  width: 100%;
}

.subplot--stacked {
  width: 100%;
}

.subplot--compact {
  height: 100%;
}

.mini-slice {
  border: 1px solid rgba(var(--fg0-rgb), 0.10);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  background: transparent;
}

.mini-slice--selected {
  border-color: rgba(var(--accent-rgb), 0.85);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.35), 0 6px 18px rgba(var(--accent-rgb), 0.12);
}

.mini-slice__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.mini-slice__name {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.mini-slice__chip {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 1px solid rgba(var(--fg0-rgb), 0.35);
}

.mini-slice__canvas {
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--fg0-rgb), 0.12);
  background: transparent;
}

.subplot h4 {
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  color: var(--text-strong);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.subplot-canvas {
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--fg0-rgb), 0.12);
  background: transparent;
}

.mini-slices {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-md);
}

.value-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.value-bars {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  align-items: flex-end;
}

.value-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  align-items: center;
  flex: 1 1 120px;
}

.value-bar__track {
  position: relative;
  width: 18px;
  height: 140px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--fg0-rgb), 0.14);
  background: linear-gradient(180deg, rgba(var(--fg0-rgb), 0.12) 0%, rgba(var(--bg2-rgb), 0.35) 100%);
  overflow: hidden;
}

.value-bar__fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-radius: var(--radius-sm);
  transition: height 160ms ease, filter 160ms ease;
  filter: drop-shadow(0 0 6px rgba(var(--fg0-rgb), 0.12));
}

.value-bars--compact {
  flex-wrap: nowrap;
  justify-content: space-around;
}

.value-bar__track--compact {
  height: 120px;
  width: 16px;
}

.value-bar__meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.value-bar__name {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
}

.value-bar__value {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-subtle);
}

.value-bar--selected .value-bar__track {
  border-color: rgba(var(--accent-rgb), 0.7);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.3), 0 12px 24px rgba(var(--accent-rgb), 0.12);
}

.color-details {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: transparent;
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
  backdrop-filter: blur(10px);
}

.color-details h4 {
  font-size: var(--text-md);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  color: var(--accent);
}

.color-info {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-strong);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.color-values p {
  margin: var(--space-xs) 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--fg1);
}

.live-preview {
  margin-top: var(--space-md);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.live-preview__card {
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  border: 1px solid rgba(var(--fg0-rgb), 0.12);
  backdrop-filter: blur(10px);
}

.live-preview__label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.live-preview__sample {
  margin-top: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.35;
}

@media (max-width: 1024px) {
  .wheel-container {
    grid-template-columns: 1fr;
  }

  .wheel-column {
    justify-items: center;
  }

  .subplot-row {
    grid-template-columns: 1fr;
  }

  .mini-slices {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}

@media (max-width: 768px) {
  .wheel-container {
    padding: var(--space-md);
  }

  .mini-slices {
    grid-template-columns: 1fr;
  }
  
  .color-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .live-preview {
    grid-template-columns: 1fr;
  }
}
</style>
