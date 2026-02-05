<script setup lang="ts">
import { scaleLinear } from "d3-scale";
import { computed, onMounted, ref, watch } from "vue";
import { useTheme } from "../../composables/useTheme.js";
import { useThemeAnalysis } from "../../composables/useThemeAnalysis.js";
import { hexToRgba } from "../../utils/color-utils.js";

const { oklchColors } = useThemeAnalysis();
const { currentTheme } = useTheme();

// Analysis palette (same as in OKLCHPolarWheel)
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

const chromaCeiling = computed(() => {
  const maxC = analysisColors.value.reduce((m, c) => Math.max(m, c.c || 0), 0.1);
  return clamp(maxC + 0.05, 0.18, 0.4);
});

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const canvas = ref<HTMLCanvasElement>();
const hueCanvas = ref<HTMLCanvasElement>();
const canvasWidth = 600;
const canvasHeight = 500;

// Define ideal OKLCH zones based on research
const idealZones = computed(() => {
  const colors = currentTheme.value?.colors;
  if (!colors) {
    throw new Error("LightnessPlots: Theme colors not loaded");
  }

  return [
    { name: "Dark UI", lRange: [0.15, 0.3], cRange: [0, 0.15], color: hexToRgba(colors.bg2, 0.3) },
    {
      name: "Accents",
      lRange: [0.4, 0.7],
      cRange: [0.15, 0.35],
      color: hexToRgba(colors.accent, 0.2),
    },
    { name: "Text", lRange: [0.75, 0.95], cRange: [0, 0.05], color: hexToRgba(colors.fg1, 0.2) },
  ];
});

// Scales
const lightnessScale = computed(() =>
  scaleLinear()
    .domain([0, 1])
    .range([canvasHeight - 50, 30])
);

const chromaScale = computed(() =>
  scaleLinear()
    .domain([0, 0.4])
    .range([50, canvasWidth - 30])
);

const hueScale = computed(() =>
  scaleLinear()
    .domain([0, 360])
    .range([50, canvasWidth - 30])
);

// Statistics
const statistics = computed(() => {
  const values = oklchColors.value;
  if (values.length === 0) return { meanL: 0, meanC: 0, countInIdealZones: 0 };

  const meanL = values.reduce((sum, c) => sum + c.l, 0) / values.length;
  const meanC = values.reduce((sum, c) => sum + c.c, 0) / values.length;

  const countInIdealZones = values.filter(color => {
    return idealZones.value.some(
      zone =>
        color.l >= zone.lRange[0] &&
        color.l <= zone.lRange[1] &&
        color.c >= zone.cRange[0] &&
        color.c <= zone.cRange[1]
    );
  }).length;

  return { meanL, meanC, countInIdealZones };
});

function render() {
  if (!canvas.value) return;

  const ctx = canvas.value.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const lScale = lightnessScale.value;
  const cScale = chromaScale.value;

  const fg1 = currentTheme.value?.colors.fg1 || "#ffffff";
  const axisColor = hexToRgba(fg1, 0.3);
  const gridColor = hexToRgba(fg1, 0.1);
  const textColor = hexToRgba(fg1, 0.5);
  const labelColor = hexToRgba(fg1, 0.9);

  // Draw axes
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;

  // Lightness axis (vertical)
  ctx.beginPath();
  ctx.moveTo(50, 30);
  ctx.lineTo(50, canvasHeight - 50);
  ctx.stroke();

  // Chroma axis (horizontal)
  ctx.beginPath();
  ctx.moveTo(50, canvasHeight - 50);
  ctx.lineTo(canvasWidth - 30, canvasHeight - 50);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = labelColor;
  ctx.font = "12px monospace";
  ctx.save();
  ctx.translate(20, canvasHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Lightness (L)", 0, 0);
  ctx.restore();

  ctx.fillText("Chroma (C)", canvasWidth / 2 - 40, canvasHeight - 20);

  // Draw grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let l = 0.2; l <= 1; l += 0.2) {
    const y = lScale(l);
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(canvasWidth - 30, y);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(l.toFixed(1), 10, y + 5);
  }

  for (let c = 0.1; c <= 0.4; c += 0.1) {
    const x = cScale(c);
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, canvasHeight - 50);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(c.toFixed(1), x - 10, canvasHeight - 35);
  }

  // Draw ideal zones
  idealZones.value.forEach(zone => {
    const x1 = cScale(zone.cRange[0]);
    const x2 = cScale(zone.cRange[1]);
    const y1 = lScale(zone.lRange[1]);
    const y2 = lScale(zone.lRange[0]);

    ctx.fillStyle = zone.color;
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

    // Zone label
    ctx.fillStyle = hexToRgba(fg1, 0.7);
    ctx.font = "11px monospace";
    ctx.fillText(zone.name, x1 + 5, y1 + 15);
  });

  // Draw color points
  oklchColors.value.forEach(color => {
    const x = cScale(color.c);
    const y = lScale(color.l);

    // Draw actual color as point
    ctx.fillStyle = color.hex;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Add border (using bg2/bg for contrast or just white/black based on theme?)
    // Keeping semitransparent white for now as it's simple
    ctx.strokeStyle = hexToRgba(fg1, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add indicator if out of gamut
    if (!color.inSRGB) {
      ctx.strokeStyle = "red"; // Keep red for warnings
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Draw legend
  const legendX = canvasWidth - 200;
  const legendY = 50;

  ctx.fillStyle = hexToRgba(currentTheme.value?.colors.bg1 || "#000000", 0.8);
  ctx.fillRect(legendX, legendY, 180, 100);

  ctx.fillStyle = labelColor;
  ctx.font = "12px monospace";
  ctx.fillText("Legend", legendX + 10, legendY + 20);

  // Ideal zone indicator
  if (idealZones.value.length > 0) {
    ctx.fillStyle = idealZones.value[0].color;
    ctx.fillRect(legendX + 10, legendY + 30, 15, 15);
    ctx.fillStyle = textColor;
    ctx.fillText("Ideal zones", legendX + 30, legendY + 42);
  }

  // Out of gamut indicator
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(legendX + 17, legendY + 60, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.fillText("Out of sRGB", legendX + 30, legendY + 65);
}

function renderHuePlot() {
  if (!hueCanvas.value) return;

  const ctx = hueCanvas.value.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const lScale = lightnessScale.value;
  const hScale = hueScale.value;

  const fg1 = currentTheme.value?.colors.fg1 || "#ffffff";
  const axisColor = hexToRgba(fg1, 0.3);
  const gridColor = hexToRgba(fg1, 0.1);
  const textColor = hexToRgba(fg1, 0.5);
  const labelColor = hexToRgba(fg1, 0.9);

  // Draw axes
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;

  // Lightness axis (vertical)
  ctx.beginPath();
  ctx.moveTo(50, 30);
  ctx.lineTo(50, canvasHeight - 50);
  ctx.stroke();

  // Hue axis (horizontal)
  ctx.beginPath();
  ctx.moveTo(50, canvasHeight - 50);
  ctx.lineTo(canvasWidth - 30, canvasHeight - 50);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = labelColor;
  ctx.font = "12px monospace";
  ctx.save();
  ctx.translate(20, canvasHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Lightness (L)", 0, 0);
  ctx.restore();

  ctx.fillText("Hue (H°)", canvasWidth / 2 - 40, canvasHeight - 20);

  // Draw grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;

  // Lightness grid
  for (let l = 0.2; l <= 1; l += 0.2) {
    const y = lScale(l);
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(canvasWidth - 30, y);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(l.toFixed(1), 10, y + 5);
  }

  // Hue grid (every 60 degrees)
  for (let h = 60; h <= 360; h += 60) {
    const x = hScale(h);
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, canvasHeight - 50);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(`${h}°`, x - 15, canvasHeight - 35);
  }

  // Draw ideal zones (reuse idealZones but ignore C range)
  idealZones.value.forEach(zone => {
    const y1 = lScale(zone.lRange[1]);
    const y2 = lScale(zone.lRange[0]);

    ctx.fillStyle = zone.color;
    ctx.fillRect(50, y1, canvasWidth - 80, y2 - y1);

    // Zone label
    ctx.fillStyle = hexToRgba(fg1, 0.7);
    ctx.font = "11px monospace";
    ctx.fillText(zone.name, 55, y1 + 15);
  });

  // Draw color points
  oklchColors.value.forEach(color => {
    const x = hScale(color.h || 0);
    const y = lScale(color.l);

    // Draw actual color as point
    ctx.fillStyle = color.hex;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Add border
    ctx.strokeStyle = hexToRgba(fg1, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add indicator if out of gamut
    if (!color.inSRGB) {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

onMounted(() => {
  render();
  renderHuePlot();
});

// Watch both colors and theme changes
watch(
  [oklchColors, currentTheme],
  () => {
    requestAnimationFrame(() => {
      render();
      renderHuePlot();
    });
  },
  { deep: true }
);

// Some TS configurations (and editor diagnostics) don't account for template usage
// when reporting noUnusedLocals in <script setup>.
void chromaCeiling;
void statistics;
</script>

<template>
  <div class="density-map">
    <div v-if="oklchColors.length === 0" class="loading-message">
      Loading theme colors...
    </div>
    
    <div v-else class="plots-container">
      <div class="plot-wrapper">
        <h3>L-C</h3>
        <canvas 
          ref="canvas" 
          :width="canvasWidth" 
          :height="canvasHeight"
          class="density-canvas"
        />
      </div>
      
      <div class="plot-wrapper">
        <h3>L-H</h3>
        <canvas 
          ref="hueCanvas" 
          :width="canvasWidth" 
          :height="canvasHeight"
          class="density-canvas"
        />
      </div>
    </div>
    
    <div class="statistics-grid">
      <div class="stat-card">
        <span class="stat-label">Mean Lightness</span>
        <span class="stat-value">{{ statistics.meanL.toFixed(3) }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Mean Chroma</span>
        <span class="stat-value">{{ statistics.meanC.toFixed(3) }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">In Ideal Zones</span>
        <span class="stat-value">{{ statistics.countInIdealZones }} / {{ oklchColors.length }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Coverage</span>
        <span class="stat-value">{{ ((statistics.countInIdealZones / oklchColors.length) * 100).toFixed(1) }}%</span>
      </div>
    </div>
    
    <!-- H/L/C Bar Charts -->
    <div class="bars-section">
      <div class="subplot subplot--compact value-panel">
        <h4>Hue (H)</h4>
        <div class="value-bars value-bars--compact">
          <div
            v-for="color in analysisColors"
            :key="color.key + '-h'"
            class="value-bar"
          >
            <div class="value-bar__track value-bar__track--compact">
              <div
                class="value-bar__fill"
                :style="{
                  height: '100%',
                  background: color.hex
                }"
              />
            </div>
            <div class="value-bar__meta">
              <span class="value-bar__name">{{ color.label ?? color.key }}</span>
              <span class="value-bar__value">{{ Math.round(color.h || 0) }}°</span>
            </div>
          </div>
        </div>
      </div>

      <div class="subplot subplot--compact value-panel">
        <h4>Lightness (L)</h4>
        <div class="value-bars value-bars--compact">
          <div
            v-for="color in analysisColors"
            :key="color.key + '-l'"
            class="value-bar"
          >
            <div class="value-bar__track value-bar__track--compact">
              <div
                class="value-bar__fill"
                :style="{
                  height: Math.round(clamp(color.l || 0, 0, 1) * 100) + '%',
                  background: color.hex
                }"
              />
            </div>
            <div class="value-bar__meta">
              <span class="value-bar__name">{{ color.label ?? color.key }}</span>
              <span class="value-bar__value">{{ Math.round(clamp(color.l || 0, 0, 1) * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="subplot subplot--compact value-panel">
        <h4>Chroma (C)</h4>
        <div class="value-bars value-bars--compact">
          <div
            v-for="color in analysisColors"
            :key="color.key + '-c'"
            class="value-bar"
          >
            <div class="value-bar__track value-bar__track--compact">
              <div
                class="value-bar__fill"
                :style="{
                  height: Math.round(clamp((color.c || 0) / chromaCeiling, 0, 1) * 100) + '%',
                  background: color.hex
                }"
              />
            </div>
            <div class="value-bar__meta">
              <span class="value-bar__name">{{ color.label ?? color.key }}</span>
              <span class="value-bar__value">{{ (color.c || 0).toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.density-map {
  padding: var(--space-lg);
}

.plots-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.plot-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.plot-wrapper h3 {
  font-size: var(--text-lg);
  font-weight: 600;
  /* Color from typography.css: --text-primary */
  text-align: center;
}

.density-canvas {
  width: 100%;
  height: auto;
  background: var(--surface-base);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}

@media (max-width: 1200px) {
  .plots-container {
    grid-template-columns: 1fr;
  }
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--surface-elevated);
  border-radius: var(--radius-sm);
  text-align: center;
  color: var(--text-strong);
}

.stat-label {
  font-size: var(--text-sm);
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: 600;
  color: inherit;
  font-variant-numeric: tabular-nums;
}

.bars-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.subplot {
  background: transparent;
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-muted);
  backdrop-filter: blur(10px);
}

.subplot--compact {
  height: 100%;
}

.subplot h4 {
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  color: var(--text-strong);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.value-bars--compact {
  flex-wrap: nowrap;
  justify-content: space-around;
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

.value-bar__track--compact {
  width: 16px;
  height: 120px;
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

.value-bar__meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 40px;
}

.value-bar__name {
  font-size: var(--text-xs);
  color: var(--text-subtle);
  text-transform: capitalize;
  text-align: center;
  line-height: 1.2;
}

.value-bar__value {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
</style>
