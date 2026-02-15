<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  content: string;
  highlightToken?: string;
  isJson?: boolean;
  exportFormat?: string;
}>();

const JSON_EXPORT_FORMATS = new Set(["design-tokens-w3c", "json-flat", "json-grouped"]);

const lines = computed(() => props.content.split("\n"));
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
const tokenizedLines = computed(() =>
  lines.value.map(line =>
    shouldTokenizeJson.value ? tokenizeJsonLine(line) : tokenizeStructuredLine(line)
  )
);

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

void lines;
void shouldTokenizeJson;
void tokenizedLines;
void isHighlighted;
void tokenizeJsonLine;
void tokenizeStructuredLine;
</script>

<template>
  <pre class="export-preview"><code><span
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
</template>

<style scoped>
.export-preview {
  max-height: 260px;
  overflow: auto;
  margin: 0;
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg0);
  color: var(--fg0);
}

.export-preview__line {
  display: block;
}

.export-preview__line--highlight {
  background: color-mix(in oklab, var(--accent) 22%, transparent);
}

.export-preview__token--key {
  color: var(--syntax-keywords, var(--caligo-syntax-keywords, #8db4d0));
  font-weight: 600;
}

.export-preview__token--string {
  color: var(--syntax-strings, var(--caligo-syntax-strings, #ffa659));
}

.export-preview__token--comment {
  color: var(--syntax-comments, var(--caligo-syntax-comments, var(--fg-muted)));
  font-style: italic;
}

.export-preview__token--variable {
  color: var(--syntax-keywords, var(--caligo-syntax-keywords, #8db4d0));
}

.export-preview__token--function {
  color: var(--syntax-functions, var(--caligo-syntax-functions, #ff96a9));
}

.export-preview__token--hex {
  color: var(--accent, var(--caligo-accent, #ff9a69));
}

.export-preview__token--number,
.export-preview__token--keyword {
  color: var(--syntax-types, var(--caligo-syntax-types, #8db4d0));
}
</style>
