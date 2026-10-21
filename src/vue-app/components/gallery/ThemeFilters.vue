<script setup lang="ts">
/** One quiet toolbar: theme, mode and a name search. Filters only narrow the matrix. */
import { useId } from "vue";

type Option = { id: string; label: string };

defineProps<{
  seeds: Option[];
  modes: Option[];
  shown: number;
  total: number;
  canClear: boolean;
}>();

const seed = defineModel<string>("seed", { default: "" });
const mode = defineModel<string>("mode", { default: "" });
const search = defineModel<string>("search", { default: "" });
const emit = defineEmits<{ clear: [] }>();

const uid = useId();
const seedId = `${uid}-seed`;
const modeId = `${uid}-mode`;
const searchId = `${uid}-search`;

</script>

<template>
  <div class="filters" role="search" aria-label="Filter variants">
    <div class="field">
      <label :for="seedId">Theme</label>
      <select :id="seedId" v-model="seed">
        <option value="">All themes</option>
        <option v-for="s in seeds" :key="s.id" :value="s.id">{{ s.label }}</option>
      </select>
    </div>

    <div class="field">
      <label :for="modeId">Mode</label>
      <select :id="modeId" v-model="mode">
        <option value="">All modes</option>
        <option v-for="m in modes" :key="m.id" :value="m.id">{{ m.label }}</option>
      </select>
    </div>

    <div class="field field--search">
      <label :for="searchId">Search</label>
      <input
        :id="searchId"
        v-model="search"
        type="search"
        placeholder="Name of a variant"
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    <p class="status" aria-live="polite">{{ shown }} of {{ total }} variants</p>

    <button v-if="canClear" type="button" class="clear" @click="emit('clear')">
      Clear filters
    </button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field label {
  color: var(--fg-muted);
  font-size: var(--step--1);
}

.field--search {
  flex: 1 1 14rem;
  max-width: 22rem;
}

select,
input {
  box-sizing: border-box;
  height: 40px;
  min-width: 0;
  padding: 0 12px;
  border: 1px solid color-mix(in oklab, var(--fg0) 16%, transparent);
  border-radius: 8px;
  background-color: var(--bg1);
  color: var(--fg0);
  font: inherit;
  font-size: var(--step-0);
}

select {
  min-width: 10.5rem;
  padding-right: 34px;
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--fg-muted) 50%),
    linear-gradient(135deg, var(--fg-muted) 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 50%,
    calc(100% - 13px) 50%;
  background-size: 5px 5px;
  background-repeat: no-repeat;
  cursor: pointer;
}

input::placeholder {
  color: var(--fg-muted);
}

select:hover,
input:hover {
  border-color: color-mix(in oklab, var(--fg0) 32%, transparent);
}

select:focus-visible,
input:focus-visible,
.clear:focus-visible {
  outline: 2px solid var(--fg0);
  outline-offset: 2px;
}

.status {
  margin: 0;
  padding-bottom: 10px;
  color: var(--fg-muted);
  font-size: var(--step--1);
  font-variant-numeric: tabular-nums;
}

.clear {
  height: 40px;
  padding: 0 14px;
  border: 1px solid color-mix(in oklab, var(--fg0) 16%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--fg0);
  font: inherit;
  font-size: var(--step--1);
  font-weight: 600;
  cursor: pointer;
}

.clear:hover {
  border-color: color-mix(in oklab, var(--fg0) 40%, transparent);
}

@media (max-width: 560px) {
  .field {
    flex: 1 1 8rem;
  }

  select {
    width: 100%;
    min-width: 0;
  }

  .field--search {
    flex-basis: 100%;
    max-width: none;
  }
}
</style>
