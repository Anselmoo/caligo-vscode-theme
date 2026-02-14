<script setup lang="ts">
import { computed, ref } from "vue";

type Segment = { text: string; cls: string };

const DEFAULT_SAMPLE = `@sealed

export class Palette {
  constructor(private readonly name: string) {}

  render(): string {
    return "Caligo: " + this.name;
  }
}

// error throw new Error("Forbidden black");`;

const isEditable = ref(false);
const sampleSource = ref(DEFAULT_SAMPLE);

function lineToSegments(line: string): Segment[] {
  if (line.trim().startsWith("//")) {
    return [{ text: line, cls: "tok-muted" }];
  }

  return line.split(/(\s+)/).map(chunk => {
    if (!chunk || /^\s+$/.test(chunk)) return { text: chunk, cls: "" };
    if (/^@\w+/.test(chunk)) return { text: chunk, cls: "tok-decorator" };
    if (/^(export|class|constructor|private|readonly|return|this|new|throw)\b/.test(chunk)) {
      return { text: chunk, cls: "tok-keyword" };
    }
    if (/^(Palette|string|Error)\b/.test(chunk)) return { text: chunk, cls: "tok-type" };
    if (/^(render|name|sealed)\b/.test(chunk)) return { text: chunk, cls: "tok-fn" };
    if (/^["'`].*["'`]$/.test(chunk) || chunk.includes('"') || chunk.includes("'")) {
      return { text: chunk, cls: "tok-string" };
    }
    if (/^[{}()[\].;:+-]+$/.test(chunk)) return { text: chunk, cls: "tok-punct" };
    return { text: chunk, cls: "" };
  });
}

const highlightedLines = computed(() => sampleSource.value.split("\n").map(lineToSegments));

function onToggleEditable() {
  isEditable.value = !isEditable.value;
}

function onResetSample() {
  sampleSource.value = DEFAULT_SAMPLE;
}
void highlightedLines;
void onToggleEditable;
void onResetSample;
</script>

<template>
  <div class="live-token-sample preview-panel">
    <div class="live-token-header">
      <div>
        <h3 class="live-token-title">Live token sample</h3>
        <p class="live-token-subtitle">Switch to editable mode to adjust code and preview token styling live.</p>
      </div>
      <div class="live-token-actions">
        <button
          class="preview-action-button"
          type="button"
          :aria-label="isEditable ? 'Switch to read-only mode' : 'Switch to editable mode'"
          :aria-pressed="isEditable"
          @click="onToggleEditable"
        >
          {{ isEditable ? 'Read-only mode' : 'Editable mode' }}
        </button>
        <button
          v-if="isEditable"
          class="preview-action-button"
          type="button"
          aria-label="Reset sample"
          @click="onResetSample"
        >
          Reset sample
        </button>
      </div>
    </div>

    <textarea
      v-if="isEditable"
      v-model="sampleSource"
      class="live-token-editor preview-control"
      rows="8"
      aria-label="Editable token sample code"
      spellcheck="false"
    ></textarea>

    <pre class="sample-code"><code>
<span
  v-for="(line, lineIndex) in highlightedLines"
  :key="`line-${lineIndex}`"
  class="sample-line"
><span
  v-for="(segment, segmentIndex) in line"
  :key="`segment-${lineIndex}-${segmentIndex}`"
  :class="segment.cls"
>{{ segment.text }}</span></span></code></pre>
  </div>
</template>

<style scoped>
.live-token-sample {
  padding: var(--space-xl);
}

.live-token-header {
  margin-bottom: var(--space-lg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-md);
}

.live-token-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--app-text-primary, var(--syntax-types));
  margin-bottom: var(--space-xs);
}

.live-token-subtitle {
  font-size: var(--text-sm);
  color: var(--app-text-muted, var(--syntax-functions));
  margin: 0;
}

.live-token-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.live-token-editor {
  box-sizing: border-box;
  font-family: var(--font-mono, 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace);
  font-size: var(--text-sm);
  line-height: 1.6;
  margin: 0 0 var(--space-md);
  min-height: 180px;
  resize: vertical;
  width: 100%;
}

.sample-code {
  background: var(--bg0);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  font-family: var(--font-mono, 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace);
  font-size: var(--text-sm);
  line-height: 1.6;
  overflow: auto;
  max-height: 420px;
  color: var(--syntax-types);
  margin: 0;
  white-space: pre-wrap;
}

.sample-line {
  display: block;
  min-height: 1.6em;
}

.tok-keyword {
  color: var(--syntax-keywords);
  font-weight: 600;
}

.tok-type {
  color: var(--syntax-types);
}

.tok-fn {
  color: var(--syntax-functions);
}

.tok-string {
  color: var(--syntax-strings);
}

.tok-decorator {
  color: var(--syntax-decorator);
}

.tok-muted {
  color: var(--syntax-decorator);
  font-style: italic;
}

.tok-punct {
  color: var(--syntax-types);
}

@media (max-width: 640px) {
  .live-token-header {
    flex-direction: column;
  }
}
</style>
