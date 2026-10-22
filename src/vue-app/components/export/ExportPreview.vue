<script setup lang="ts">
/**
 * The exported file, highlighted. It never scrolls inside itself (a scroll area
 * with no tab stop is unreachable by keyboard in some browsers): long files show
 * their first lines under a fade, and a native button reveals the rest. The full
 * text is always in the DOM, so screen readers and find-in-page see all of it.
 */
import { computed, ref, useId, watch } from "vue";

const props = defineProps<{
  content: string;
  highlightToken?: string;
  isJson?: boolean;
  exportFormat?: string;
}>();

const JSON_EXPORT_FORMATS = new Set(["design-tokens-w3c", "json-flat", "json-grouped"]);

const lines = computed(() => props.content.split("\n"));

const COLLAPSED_LINES = 14;
const codeId = useId();
const expanded = ref(false);
const canExpand = computed(() => lines.value.length > COLLAPSED_LINES);
watch(
  () => props.exportFormat,
  () => {
    expanded.value = false;
  }
);
const shouldTokenizeJson = computed(() => {
  if (props.isJson) return true;
  if (props.exportFormat && JSON_EXPORT_FORMATS.has(props.exportFormat)) return true;
  const trimmed = props.content.trim();
  if (!trimmed || !(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
});
// biome-ignore lint/correctness/noUnusedVariables: used in the template (v-for); biome's Vue support misses it
const tokenizedLines = computed(() =>
  lines.value.map(line =>
    shouldTokenizeJson.value ? tokenizeJsonLine(line) : tokenizeStructuredLine(line)
  )
);

// biome-ignore lint/correctness/noUnusedVariables: used in the template (:class); biome's Vue support misses it
function isHighlighted(line: string): boolean {
  if (!props.highlightToken) return false;
  const lower = props.highlightToken.toLowerCase();
  const kebab = props.highlightToken.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const snake = kebab.replace(/-/g, "_");
  const normalizedLine = line.toLowerCase();
  return (
    normalizedLine.includes(lower) ||
    normalizedLine.includes(kebab) ||
    normalizedLine.includes(snake)
  );
}

function tokenizeJsonLine(line: string): Array<{ type: string; value: string }> {
  if (!line.length) return [{ type: "plain", value: "" }];
  const KEY_PATTERN = '"(?:[^"\\\\]|\\\\.)*"\\s*:';
  const STRING_PATTERN = '"(?:[^"\\\\]|\\\\.)*"';
  const KEYWORD_PATTERN = "\\btrue\\b|\\bfalse\\b|\\bnull\\b";
  const NUMBER_PATTERN = "-?\\d+(?:\\.\\d+)?";
  const regex = new RegExp(
    `(${KEY_PATTERN})|(${STRING_PATTERN})|(${KEYWORD_PATTERN})|(${NUMBER_PATTERN})`,
    "g"
  );
  const tokens: Array<{ type: string; value: string }> = [];
  let lastIndex = 0;
  for (const match of line.matchAll(regex)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      tokens.push({ type: "plain", value: line.slice(lastIndex, matchIndex) });
    }
    const value = match[0];
    if (match[1]) {
      tokens.push({ type: "key", value });
    } else if (match[2]) {
      tokens.push({
        type: /#(?:[\da-fA-F]{6}|[\da-fA-F]{8})/.test(value) ? "hex" : "string",
        value,
      });
    } else if (match[3]) {
      tokens.push({ type: "keyword", value });
    } else {
      tokens.push({ type: "number", value });
    }
    lastIndex = matchIndex + value.length;
  }
  if (lastIndex < line.length) {
    tokens.push({ type: "plain", value: line.slice(lastIndex) });
  }
  return tokens;
}

function tokenizeStructuredLine(line: string): Array<{ type: string; value: string }> {
  if (!line.length) return [{ type: "plain", value: "" }];

  const COMMENT_PATTERN = "//.*$|/\\*.*\\*/";
  const VARIABLE_PATTERN = "(?:\\$|--)[a-zA-Z0-9_-]+";
  const KEY_PATTERN = '"(?:[^"\\\\]|\\\\.)*"\\s*:|\\b[a-zA-Z_][a-zA-Z0-9_-]*\\s*:';
  const FUNCTION_PATTERN = "\\b(?:oklch|rgb|rgba|hsl|hsla|var)\\s*\\(";
  const HEX_PATTERN = "#(?:[\\da-fA-F]{6}|[\\da-fA-F]{8})";
  const STRING_PATTERN = '"(?:[^"\\\\]|\\\\.)*"';
  const KEYWORD_PATTERN = "\\btrue\\b|\\bfalse\\b|\\bnull\\b|\\bundefined\\b";
  const NUMBER_PATTERN = "-?\\d+(?:\\.\\d+)?%?";

  const regex = new RegExp(
    `(${COMMENT_PATTERN})|(${VARIABLE_PATTERN})|(${KEY_PATTERN})|(${FUNCTION_PATTERN})|(${HEX_PATTERN})|(${STRING_PATTERN})|(${KEYWORD_PATTERN})|(${NUMBER_PATTERN})`,
    "g"
  );

  const tokens: Array<{ type: string; value: string }> = [];
  let lastIndex = 0;

  for (const match of line.matchAll(regex)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      tokens.push({ type: "plain", value: line.slice(lastIndex, matchIndex) });
    }

    const value = match[0];
    if (match[1]) {
      tokens.push({ type: "comment", value });
    } else if (match[2]) {
      tokens.push({ type: "variable", value });
    } else if (match[3]) {
      tokens.push({ type: "key", value });
    } else if (match[4]) {
      tokens.push({ type: "function", value });
    } else if (match[5]) {
      tokens.push({ type: "hex", value });
    } else if (match[6]) {
      tokens.push({ type: "string", value });
    } else if (match[7]) {
      tokens.push({ type: "keyword", value });
    } else {
      tokens.push({ type: "number", value });
    }

    lastIndex = matchIndex + value.length;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: "plain", value: line.slice(lastIndex) });
  }

  return tokens;
}

</script>

<template>
  <section class="export-preview" aria-label="Export preview">
    <pre
      :id="codeId"
      class="export-preview__code"
      :class="{ 'is-collapsed': canExpand && !expanded }"
    ><code><span
    v-for="(lineTokens, index) in tokenizedLines"
    :key="`${index}-${lines[index]}`"
    class="export-preview__line"
    :class="{ 'export-preview__line--highlight': isHighlighted(lines[index] ?? '') }"
  ><span
    v-for="(token, tokenIndex) in lineTokens"
    :key="`${index}-${tokenIndex}-${token.value}`"
    :class="`export-preview__token export-preview__token--${token.type}`"
  >{{ token.value }}</span>
</span></code></pre>
    <button
      v-if="canExpand"
      type="button"
      class="export-preview__more"
      :aria-expanded="expanded"
      :aria-controls="codeId"
      @click="expanded = !expanded"
    >
      {{ expanded ? "Show fewer lines" : `Show all ${lines.length} lines` }}
    </button>
  </section>
</template>

<!--
  Token inks are limited to the colours that clear 4.5:1 over the background in every
  theme (fg, keywords, types, functions, decorator). `strings` is translucent and
  `accent` dips under 4.5:1 in a few themes, so neither is used for small text here.
-->
<style scoped>
.export-preview {
  margin: 0;
  border: 1px solid color-mix(in oklab, var(--fg0) 12%, transparent);
  border-radius: var(--radius-md);
  background: var(--bg1);
  color: var(--fg0);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.7;
  tab-size: 2;
  /* Clips the code block's corners to the rounded border. */
  overflow: hidden;
}

/* The global `pre` style paints its own block, so it is reset to sit flush inside
   the frame. Long lines wrap; the block never scrolls on its own. */
.export-preview__code {
  margin: 0;
  padding: 18px 20px;
  border-radius: 0;
  background: none;
  color: inherit;
  font: inherit;
  overflow: visible;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.export-preview__code.is-collapsed {
  max-height: calc(14 * 1.7em + 18px);
  overflow: hidden;
  mask-image: linear-gradient(to bottom, black 70%, transparent);
}

.export-preview__more {
  display: block;
  width: 100%;
  min-height: 40px;
  border: 0;
  border-top: 1px solid color-mix(in oklab, var(--fg0) 10%, transparent);
  background: color-mix(in oklab, var(--bg2) 60%, var(--bg1));
  color: var(--fg1);
  font: inherit;
  font-family: var(--font-sans);
  cursor: pointer;
}

.export-preview__more:hover {
  color: var(--fg0);
}

.export-preview__more:focus-visible {
  outline: 2px solid var(--fg0);
  outline-offset: -2px;
}

/* The global `code` style tints text and adds a chip background; reset it here. */
.export-preview code {
  padding: 0;
  border-radius: 0;
  background: none;
  color: inherit;
  font: inherit;
}

.export-preview__line {
  display: block;
  padding: 0 6px;
  margin: 0 -6px;
  border-radius: 3px;
  white-space: pre;
}

.export-preview__line--highlight {
  background: color-mix(in oklab, var(--fg0) 10%, transparent);
}

.export-preview__token--key,
.export-preview__token--variable {
  color: var(--syntax-keywords);
}

.export-preview__token--function {
  color: var(--syntax-functions);
}

.export-preview__token--string {
  color: var(--syntax-functions);
}

.export-preview__token--hex {
  color: var(--syntax-types);
}

.export-preview__token--number,
.export-preview__token--keyword {
  color: var(--syntax-decorator);
}

.export-preview__token--comment {
  color: var(--fg-muted);
}
</style>
