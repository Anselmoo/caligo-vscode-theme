<script setup lang="ts">
interface Props {
  search: string;
  seed: string;
  harmony: string;
  availableSeeds: Array<{ id: string; label: string }>;
  availableHarmonies: Array<{ id: string; label: string }>;
  resultCount: number;
  hasActiveFilters: boolean;
}

interface Emits {
  (e: "update:search", value: string): void;
  (e: "update:seed", value: string): void;
  (e: "update:harmony", value: string): void;
  (e: "clear"): void;
}

// Props are only used in the template; call defineProps for TypeScript typing without assigning
defineProps<Props>();
const emit = defineEmits<Emits>();

// biome-ignore lint/correctness/noUnusedVariables: used in Vue template
const handleSearchInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  emit("update:search", input.value);
};

// biome-ignore lint/correctness/noUnusedVariables: used in Vue template
const handleSeedChange = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  emit("update:seed", select.value);
};

// biome-ignore lint/correctness/noUnusedVariables: used in Vue template
const handleHarmonyChange = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  emit("update:harmony", select.value);
};

// biome-ignore lint/correctness/noUnusedVariables: used in Vue template
const handleClear = () => {
  emit("clear");
};
</script>

<template>
  <div class="gallery-filter">
    <div class="filter-controls">
      <!-- Search Input -->
      <div class="filter-group">
        <label for="search-input" class="filter-label">Search</label>
        <input
          id="search-input"
          type="text"
          :value="search"
          @input="handleSearchInput"
          placeholder="Search themes..."
          class="filter-input"
        />
      </div>

      <!-- Seed Filter -->
      <div class="filter-group">
        <label for="seed-filter" class="filter-label">Seed</label>
        <select
          id="seed-filter"
          :value="seed"
          @change="handleSeedChange"
          class="filter-select"
        >
          <option value="">All Seeds</option>
          <option
            v-for="seedOption in availableSeeds"
            :key="seedOption.id"
            :value="seedOption.id"
          >
            {{ seedOption.label }}
          </option>
        </select>
      </div>

      <!-- Harmony Filter -->
      <div class="filter-group">
        <label for="harmony-filter" class="filter-label">Harmony</label>
        <select
          id="harmony-filter"
          :value="harmony"
          @change="handleHarmonyChange"
          class="filter-select"
        >
          <option value="">All Harmonies</option>
          <option
            v-for="harmonyOption in availableHarmonies"
            :key="harmonyOption.id"
            :value="harmonyOption.id"
          >
            {{ harmonyOption.label }}
          </option>
        </select>
      </div>

      <!-- Clear Button -->
      <div class="filter-group">
        <button
          v-if="hasActiveFilters"
          @click="handleClear"
          class="btn-clear"
          type="button"
        >
          Clear Filters
        </button>
      </div>
    </div>

    <!-- Result Count -->
    <div class="filter-results">
      <p class="result-text">
        Showing {{ resultCount }} theme{{ resultCount !== 1 ? 's' : '' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.gallery-filter {
  background: var(--bg1);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.filter-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.filter-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
}

.filter-input,
.filter-select {
  background: var(--bg2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: var(--space-sm);
  font-size: var(--text-base);
  transition: all var(--transition-fast);
}

.filter-input:focus,
.filter-select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-color: var(--accent);
}

.filter-input::placeholder {
  color: var(--text-subtle);
  opacity: 0.6;
}

.btn-clear {
  background: var(--error);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-top: auto;
}

.btn-clear:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}

.filter-results {
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.result-text {
  font-size: var(--text-sm);
  color: var(--text-primary);
  text-align: center;
}

@media (max-width: 768px) {
  .filter-controls {
    grid-template-columns: 1fr;
  }
}
</style>
