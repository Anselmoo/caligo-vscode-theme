<script setup lang="ts">
/**
 * A small, honest editor window: every colour comes from the selected theme's
 * syntax tokens (--syntax-*), so switching theme re-colours it with no logic here.
 */
import { computed } from "vue";
import { useTheme } from "../../composables/useTheme.js";

type Token = [
  kind: "kw" | "ty" | "fn" | "str" | "dec" | "num" | "com" | "pun" | "id",
  text: string,
];

const { currentTheme } = useTheme();

const themeLabel = computed(() => {
  const theme = currentTheme.value;
  return theme ? `${theme.seedLabel}, ${theme.harmonyLabel.toLowerCase()} mode` : "Caligo";
});

const themeComment = computed(() => {
  const theme = currentTheme.value;
  if (!theme) return "// Caligo";
  return `// ${theme.seedLabel}, ${theme.harmonyLabel.toLowerCase()} mode`;
});

const lines = computed<Token[][]>(() => [
  [["com", themeComment.value]],
  [["dec", "@sealed"]],
  [
    ["kw", "export class "],
    ["ty", "Night"],
    ["kw", " implements "],
    ["ty", "Scene"],
    ["pun", " {"],
  ],
  [
    ["kw", "  readonly "],
    ["id", "hue"],
    ["pun", " = "],
    ["num", `${Math.round(currentTheme.value?.oklch.bg.h ?? 285)}`],
    ["pun", ";"],
  ],
  [
    ["kw", "  constructor"],
    ["pun", "("],
    ["kw", "private "],
    ["id", "sky"],
    ["pun", ": "],
    ["ty", "Gradient"],
    ["pun", ") {}"],
  ],
  [],
  [
    ["fn", "  render"],
    ["pun", "("],
    ["id", "at"],
    ["pun", ": "],
    ["ty", "Hour"],
    ["pun", "): "],
    ["ty", "Frame"],
    ["pun", " {"],
  ],
  [
    ["kw", "    const "],
    ["id", "glow"],
    ["pun", " = "],
    ["kw", "this"],
    ["pun", "."],
    ["id", "sky"],
    ["pun", "."],
    ["fn", "mix"],
    ["pun", "("],
    ["str", '"moonlight"'],
    ["pun", ", "],
    ["num", "0.18"],
    ["pun", ");"],
  ],
  [
    ["kw", "    return "],
    ["fn", "frame"],
    ["pun", "({ "],
    ["id", "glow"],
    ["pun", ", "],
    ["id", "stars"],
    ["pun", ": "],
    ["id", "at"],
    ["pun", "."],
    ["id", "late"],
    ["pun", " ? "],
    ["num", "240"],
    ["pun", " : "],
    ["num", "0"],
    ["pun", " });"],
  ],
  [["pun", "  }"]],
  [["pun", "}"]],
]);

void lines;
void themeLabel;
</script>

<template>
  <figure class="editor">
    <!-- The sample shows the theme's real colours, translucent ones included, so it
         is presented as an image of the theme with a text alternative; its measured
         contrast is reported on the Science page. -->
    <figcaption class="visually-hidden">
      TypeScript sample rendered in {{ themeLabel }}: a decorated class with a method that
      mixes a moonlight gradient.
    </figcaption>
    <div class="editor__bar" aria-hidden="true">
      <span class="editor__tab is-active">night.ts</span>
      <span class="editor__tab">scene.ts</span>
    </div>
    <pre class="editor__code" aria-hidden="true"><code><span
      v-for="(line, n) in lines"
      :key="n"
      class="editor__line"
    ><span class="editor__gutter">{{ n + 1 }}</span><span
      v-for="(token, t) in line"
      :key="t"
      :class="`t-${token[0]}`"
    >{{ token[1] }}</span>
</span></code></pre>
    <div class="editor__status" aria-hidden="true">
      <span>TypeScript</span>
      <span>UTF-8</span>
      <span>Ln 8, Col 21</span>
    </div>
  </figure>
</template>

<style scoped>
.editor {
  margin: 0;
  border: 1px solid color-mix(in oklab, var(--fg0) 12%, transparent);
  border-radius: 12px;
  background: var(--bg1);
  box-shadow:
    0 1px 0 color-mix(in oklab, var(--fg0) 8%, transparent) inset,
    0 40px 90px -30px oklch(from var(--bg0) calc(l * 0.4) c h);
  overflow: hidden;
  view-transition-name: editor;
}

.editor__bar {
  display: flex;
  background: var(--bg0);
  border-bottom: 1px solid color-mix(in oklab, var(--fg0) 8%, transparent);
}

.editor__tab {
  padding: 9px 16px;
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  border-right: 1px solid color-mix(in oklab, var(--fg0) 8%, transparent);
}

.editor__tab.is-active {
  color: var(--fg0);
  background: var(--bg1);
  box-shadow: inset 0 2px 0 var(--accent);
}

.editor__code {
  margin: 0;
  padding: 16px 0;
  font-family: var(--font-mono);
  font-size: clamp(0.7rem, 0.62rem + 0.3vw, 0.84rem);
  font-stretch: 87.5%;
  line-height: 1.75;
  color: var(--fg1);
  overflow-x: auto;
  tab-size: 2;
}

.editor__line {
  display: block;
  padding-right: 20px;
  white-space: pre;
}

.editor__gutter {
  display: inline-block;
  width: 3.2em;
  padding-right: 1.4em;
  color: var(--fg-muted);
  text-align: right;
  user-select: none;
}

.t-kw { color: var(--syntax-keywords); }
.t-ty { color: var(--syntax-types); }
.t-fn { color: var(--syntax-functions); }
.t-str { color: var(--syntax-strings); }
.t-dec { color: var(--syntax-decorator); }
.t-num { color: var(--syntax-accent); }
.t-com { color: var(--fg-muted); font-style: italic; }
.t-pun { color: var(--fg1); }
.t-id { color: var(--fg0); }

.editor__status {
  display: flex;
  gap: 18px;
  justify-content: flex-end;
  padding: 5px 14px;
  background: var(--bg0);
  color: var(--fg-muted);
  font-size: 0.7rem;
  border-top: 1px solid color-mix(in oklab, var(--fg0) 8%, transparent);
}
</style>
