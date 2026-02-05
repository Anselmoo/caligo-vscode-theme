<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useColors } from "../../composables/useColors.js";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
};

const canvasRef = ref<HTMLCanvasElement | null>(null);
const colors = useColors();

let rafId: number | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let width = 0;
let height = 0;
let particles: Particle[] = [];

function resizeCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  width = canvas.clientWidth || window.innerWidth;
  height = canvas.clientHeight || window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

function seedParticles(count: number) {
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    radius: 0.6 + Math.random() * 1.6,
    alpha: 0.25 + Math.random() * 0.55,
  }));
}

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);

  const particleColor = colors.foregrounds.value.fgMuted || "#ffffff";

  ctx.fillStyle = particleColor;
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;
    if (p.y > height + 10) p.y = -10;
  }

  ctx.globalAlpha = 1;
  rafId = requestAnimationFrame(draw);
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  resizeCanvas();
  seedParticles(140);

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const start = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(draw);
  };
  const stop = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  };

  if (mediaQuery.matches) {
    draw();
    stop();
  } else {
    start();
  }

  const onResize = () => {
    resizeCanvas();
    seedParticles(140);
  };

  window.addEventListener("resize", onResize);

  const handleReduced = (event: MediaQueryListEvent) => {
    if (event.matches) {
      draw();
      stop();
    } else {
      start();
    }
  };

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleReduced);
  } else {
    mediaQuery.addListener(handleReduced);
  }

  onUnmounted(() => {
    stop();
    window.removeEventListener("resize", onResize);
    if (typeof mediaQuery.removeEventListener === "function") {
      mediaQuery.removeEventListener("change", handleReduced);
    } else {
      mediaQuery.removeListener(handleReduced);
    }
  });
});
</script>

<template>
  <div class="night-sky" aria-hidden="true">
    <canvas ref="canvasRef" class="particles-canvas" />
  </div>
</template>

<style scoped>
.night-sky {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.particles-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .particles-canvas {
    opacity: 0.6;
  }
}
</style>
