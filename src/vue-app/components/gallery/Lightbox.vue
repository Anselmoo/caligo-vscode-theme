<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";

interface LightboxItem {
  src: string;
  alt: string;
  title: string;
  modeLabel: string;
}

interface Props {
  open: boolean;
  items: LightboxItem[];
  currentIndex: number;
}

interface Emits {
  (e: "close"): void;
  (e: "next"): void;
  (e: "prev"): void;
  (e: "update:currentIndex", index: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const currentItem = computed(() => {
  if (props.currentIndex >= 0 && props.currentIndex < props.items.length) {
    return props.items[props.currentIndex];
  }
  return null;
});

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.open) return;

  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    emit("next");
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    emit("prev");
  }
};

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit("close");
  }
};

watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }
);

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = "";
});

// Some TS configurations (and editor diagnostics) don't account for template usage
// when reporting noUnusedLocals in <script setup>.
void currentItem;
void handleBackdropClick;
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="open" 
      class="lightbox" 
      :class="{ 'lightbox--open': open }"
      :aria-hidden="!open"
      @click="handleBackdropClick"
    >
      <div class="lightbox__top">
        <div>
          <div class="lightbox__title">{{ currentItem?.title || 'Screenshot' }}</div>
          <div class="lightbox__subtitle">Use ← → to navigate • Esc to close</div>
        </div>
        <button 
          class="lightbox__btn" 
          type="button"
          @click="emit('close')"
        >
          Close
        </button>
      </div>

      <div class="lightbox__main">
        <img 
          v-if="currentItem"
          :src="currentItem.src" 
          :alt="currentItem.alt"
          class="lightbox__img"
        />
      </div>

      <div class="lightbox__bottom">
        <div class="lightbox__meta">
          {{ currentItem?.modeLabel || '' }}
        </div>
        <div class="lightbox__nav">
          <button 
            class="lightbox__btn" 
            type="button"
            @click="emit('prev')"
          >
            Prev
          </button>
          <button 
            class="lightbox__btn" 
            type="button"
            @click="emit('next')"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(var(--bg0-rgb), 0.92);
  backdrop-filter: blur(12px);
  z-index: 999;
  display: none;
}

.lightbox--open {
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.lightbox__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  color: var(--fg-muted);
}

.lightbox__title {
  font-weight: 800;
  color: var(--fg0);
  letter-spacing: -0.3px;
}

.lightbox__subtitle {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.7;
}

.lightbox__btn {
  border: 1px solid rgba(var(--fg0-rgb), 0.18);
  background: rgba(var(--fg0-rgb), 0.06);
  color: var(--fg0);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lightbox__btn:hover {
  background: rgba(var(--fg0-rgb), 0.12);
  border-color: rgba(var(--fg0-rgb), 0.3);
}

.lightbox__main {
  display: grid;
  place-items: center;
  padding: 0 18px;
}

.lightbox__img {
  max-width: min(1400px, 96vw);
  max-height: 78vh;
  border-radius: 14px;
  border: 1px solid rgba(var(--fg0-rgb), 0.18);
  box-shadow: 0 30px 120px rgba(var(--bg0-rgb), 0.6);
}

.lightbox__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  color: var(--fg-muted);
}

.lightbox__meta {
  font-size: 13px;
}

.lightbox__nav {
  display: flex;
  gap: 8px;
}
</style>
