<script setup lang="ts">
import { computed } from "vue";
import { resolveScreenshotPath } from "@/utils/asset-paths";

interface Props {
  themeName: string;
  filename: string;
  seedId: string;
  seedLabel?: string;
  harmonyMode: string;
  harmonyLabel?: string;
}

const props = defineProps<Props>();
// biome-ignore lint/correctness/noUnusedVariables: Used in template
const emit = defineEmits<{
  open: [];
}>();
// biome-ignore lint/correctness/noUnusedVariables: Used in template
const imagePath = computed(() => {
  // Screenshots are served from public/screenshots/ which Vite serves from root
  return resolveScreenshotPath(props.filename);
});

// biome-ignore lint/correctness/noUnusedVariables: Used in template
const imageAlt = computed(() => {
  const seedText = props.seedLabel || props.seedId;
  const harmonyText = props.harmonyLabel || props.harmonyMode;
  return `${props.themeName} - ${seedText} (${harmonyText})`;
});
</script>

<template>
  <button class="screenshot-card" @click="emit('open')" type="button" :aria-label="`Open screenshot for ${props.themeName}`">
    <div class="card-image">
      <img
        :src="imagePath"
        :alt="imageAlt"
        loading="lazy"
        class="screenshot-img"
      />
    </div>
    <div class="card-content">
      <h3 class="card-title">{{ themeName }}</h3>
      <div class="card-meta">
        <span class="meta-tag">{{ seedLabel || seedId }}</span>
        <span class="meta-tag">{{ harmonyLabel || harmonyMode }}</span>
      </div>
    </div>
  </button>
</template>

<style scoped>
.screenshot-card {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  background: var(--bg2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-base);
  cursor: pointer;
  display: block;
  text-align: left;
  width: 100%;
}

.screenshot-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(var(--bg0-rgb), 0.5);
  border-color: var(--accent);
}

.card-image {
  position: relative;
  width: 100%;
  padding-top: 62.5%; /* 16:10 aspect ratio */
  background: var(--bg0);
  overflow: hidden;
}

.screenshot-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-base);
}

.screenshot-card:hover .screenshot-img {
  transform: scale(1.05);
}

.card-content {
  padding: var(--space-md);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--syntax-types);
  margin-bottom: var(--space-sm);
}

.card-meta {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.meta-tag {
  display: inline-block;
  background: var(--bg1);
  color: var(--syntax-functions);
  font-size: var(--text-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}
</style>
