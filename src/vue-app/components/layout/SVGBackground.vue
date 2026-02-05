<script setup lang="ts">
import { onMounted, ref } from "vue";

// Star with size variant
interface Star {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  delay: number;
  duration: number;
  size: "tiny" | "small" | "medium" | "large";
}

const stars = ref<Star[]>([]);
const constellationPoints = ref<{ x: number; y: number }[]>([]);
const constellationLines = ref<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

onMounted(() => {
  // Generate 120 stars (increased for better visibility) with varied sizes and twinkling patterns
  const starCount = 120;
  const generated: Star[] = [];

  for (let i = 0; i < starCount; i++) {
    const sizeRoll = Math.random();
    let size: Star["size"];
    let radius: number;

    // 50% tiny, 30% small, 15% medium, 5% large
    if (sizeRoll < 0.5) {
      size = "tiny";
      radius = 0.3 + Math.random() * 0.4;
    } else if (sizeRoll < 0.8) {
      size = "small";
      radius = 0.6 + Math.random() * 0.6;
    } else if (sizeRoll < 0.95) {
      size = "medium";
      radius = 1.0 + Math.random() * 0.8;
    } else {
      size = "large";
      radius = 1.6 + Math.random() * 1.0;
    }

    generated.push({
      cx: Math.random() * 1440,
      cy: Math.random() * 900,
      r: radius,
      opacity: 0.3 + Math.random() * 0.6,
      delay: Math.random() * 8,
      duration: 3 + Math.random() * 5, // Varied twinkle speed
      size,
    });
  }

  stars.value = generated;

  // Create a subtle constellation (zodiac-inspired pattern)
  // Simple constellation in upper-right area
  const points = [
    { x: 1100, y: 150 },
    { x: 1150, y: 120 },
    { x: 1200, y: 180 },
    { x: 1250, y: 150 },
    { x: 1180, y: 220 },
    { x: 1120, y: 240 },
  ];

  constellationPoints.value = points;

  // Connect constellation points
  constellationLines.value = [
    { x1: points[0].x, y1: points[0].y, x2: points[1].x, y2: points[1].y },
    { x1: points[1].x, y1: points[1].y, x2: points[2].x, y2: points[2].y },
    { x1: points[2].x, y1: points[2].y, x2: points[3].x, y2: points[3].y },
    { x1: points[2].x, y1: points[2].y, x2: points[4].x, y2: points[4].y },
    { x1: points[4].x, y1: points[4].y, x2: points[5].x, y2: points[5].y },
    { x1: points[5].x, y1: points[5].y, x2: points[0].x, y2: points[0].y },
  ];
});
</script>

<template>
  <div class="svg-background">
    <!-- Multi-layered Aurora Borealis with realistic color bands and constellation -->
    <svg
      class="background-pattern"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <!-- No aurora gradients needed -->
      </defs>
      
      <!-- Star field with varied sizes and twinkling (optimized rendering) -->
      <g class="stars">
        <circle
          v-for="(star, i) in stars"
          :key="i"
          :cx="star.cx"
          :cy="star.cy"
          :r="star.r"
          fill="var(--fg0)"
          :opacity="star.opacity"
          class="star"
          :class="`star-size-${star.size}`"
          :style="{ animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s` }"
        />
      </g>
      
      <!-- Constellation pattern (subtle zodiac-inspired) - improved visibility -->
      <g class="constellation" opacity="0.4">
        <line v-for="(line, i) in constellationLines" :key="`line-${i}`"
          :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
          stroke="var(--fg0)" stroke-width="0.5" opacity="0.4" />
        <circle v-for="(point, i) in constellationPoints" :key="`point-${i}`"
          :cx="point.x" :cy="point.y" r="1.5"
          fill="var(--fg0)" opacity="0.6" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.svg-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.background-pattern {
  width: 100%;
  height: 100%;
  opacity: 0.4;
  transform: translateZ(0); /* GPU acceleration */
  backface-visibility: hidden;
}

/* Star twinkling with size-based variations */
.stars {
  will-change: transform;
  transform: translateZ(0); /* GPU acceleration */
}

.star {
  animation: twinkle-default 4s ease-in-out infinite;
  filter: drop-shadow(0 0 2px var(--fg0)); /* Lightweight glow replacement */
}

.star-size-tiny {
  animation: twinkle-fast 2s ease-in-out infinite;
}

.star-size-small {
  animation: twinkle-medium 3.5s ease-in-out infinite;
}

.star-size-medium {
  animation: twinkle-default 4.5s ease-in-out infinite;
}

.star-size-large {
  animation: twinkle-slow 6s ease-in-out infinite;
}

/* Different twinkling patterns */
@keyframes twinkle-fast {
  0%, 100% { opacity: inherit; }
  25% { opacity: calc(inherit * 0.3); }
  50% { opacity: calc(inherit * 0.8); }
  75% { opacity: calc(inherit * 0.4); }
}

@keyframes twinkle-medium {
  0%, 100% { opacity: inherit; }
  30% { opacity: calc(inherit * 0.5); }
  60% { opacity: calc(inherit * 0.9); }
}

@keyframes twinkle-default {
  0%, 100% { opacity: inherit; }
  50% { opacity: calc(inherit * 0.4); }
}

@keyframes twinkle-slow {
  0%, 100% { opacity: inherit; }
  25% { opacity: calc(inherit * 0.7); }
  50% { opacity: calc(inherit * 0.5); }
  75% { opacity: calc(inherit * 0.85); }
}

/* Constellation subtle fade */
.constellation {
  animation: constellation-fade 15s ease-in-out infinite;
}

@keyframes constellation-fade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .star,
  .constellation {
    animation: none !important;
  }
}
</style>