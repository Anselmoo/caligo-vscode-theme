/**
 * Evidence probe for research/token-coverage.md, Part 2.
 * Measures, over the 50 generated themes, (a) non-text contrast (WCAG 1.4.11, 3:1) of focus rings,
 * input/selected-indicator borders against the surfaces they sit on, and (b) how far state
 * backgrounds (hover/selected/focus) sit from the rest surface they replace (WCAG ratio and OKLab dE x100).
 *
 * Run:  CONTRAST_LIB=/abs/path/to/src/lib/contrast.ts npx tsx research/scripts/state-probe.ts
 * (CONTRAST_LIB defaults to ../../src/lib/contrast.ts, which exists once the contrast-truth run is merged.)
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { converter } from "culori";

const lib = await import(process.env.CONTRAST_LIB ?? "../../src/lib/contrast.ts");
const { flattenLayers, wcagContrastRatio } = lib as {
  flattenLayers: (l: string[]) => { r: number; g: number; b: number; a: number };
  wcagContrastRatio: (fg: string, bg: string, base?: string[]) => number;
};
const oklab = converter("oklab");
const rgbToOk = (c: { r: number; g: number; b: number }) =>
  oklab({ mode: "rgb", r: c.r / 255, g: c.g / 255, b: c.b / 255 }) as {
    l: number;
    a: number;
    b: number;
  };

const dir = resolve(process.cwd(), "themes");
const themes = readdirSync(dir)
  .filter(f => /^Caligo-.*\.json$/.test(f))
  .map(f => ({
    name: f.replace(".json", ""),
    colors: JSON.parse(readFileSync(resolve(dir, f), "utf8")).colors as Record<string, string>,
  }));

type Stack = string[]; // keys bottom -> top
const get = (c: Record<string, string>, ks: Stack) => ks.map(k => c[k]);
const missing = new Set<string>();

// ---- (a) non-text contrast: fg key over a surface stack, floor 3.0
const NON_TEXT: Array<[string, Stack]> = [
  ["focusBorder", ["sideBar.background"]],
  ["focusBorder", ["editor.background"]],
  ["focusBorder", ["panel.background"]],
  ["focusBorder", ["input.background"]],
  ["input.background", ["sideBar.background"]],
  ["input.border", ["input.background"]],
  ["input.border", ["sideBar.background"]],
  ["checkbox.border", ["sideBar.background"]],
  ["dropdown.border", ["sideBar.background"]],
  ["list.focusOutline", ["sideBar.background"]],
  ["list.focusAndSelectionOutline", ["sideBar.background", "list.activeSelectionBackground"]],
  ["tab.activeBorder", ["editorGroupHeader.tabsBackground", "tab.activeBackground"]],
  ["tab.activeBorder", ["editorGroupHeader.tabsBackground", "tab.inactiveBackground"]],
  ["tab.activeBorderTop", ["editorGroupHeader.tabsBackground", "tab.inactiveBackground"]],
  ["activityBar.activeBorder", ["activityBar.background"]],
  ["panelTitle.activeBorder", ["panel.background"]],
  ["statusBarItem.focusBorder", ["statusBar.background"]],
  ["editorWidget.border", ["editor.background"]],
  ["menu.selectionBorder", ["menu.background", "menu.selectionBackground"]],
  ["inputOption.activeBorder", ["input.background"]],
];
// ---- (b) state distinguishability: [state stack, rest stack]
const STATE: Array<[string, Stack, Stack]> = [
  ["list hover vs sidebar", ["sideBar.background", "list.hoverBackground"], ["sideBar.background"]],
  [
    "list selected(active) vs hover",
    ["sideBar.background", "list.activeSelectionBackground"],
    ["sideBar.background", "list.hoverBackground"],
  ],
  [
    "list selected(inactive) vs sidebar",
    ["sideBar.background", "list.inactiveSelectionBackground"],
    ["sideBar.background"],
  ],
  ["list focus vs sidebar", ["sideBar.background", "list.focusBackground"], ["sideBar.background"]],
  [
    "tab hover vs inactive",
    ["editorGroupHeader.tabsBackground", "tab.hoverBackground"],
    ["editorGroupHeader.tabsBackground", "tab.inactiveBackground"],
  ],
  [
    "tab active vs inactive",
    ["editorGroupHeader.tabsBackground", "tab.activeBackground"],
    ["editorGroupHeader.tabsBackground", "tab.inactiveBackground"],
  ],
  [
    "statusBarItem hover vs statusBar",
    ["statusBar.background", "statusBarItem.hoverBackground"],
    ["statusBar.background"],
  ],
  ["button hover vs rest", ["button.background", "button.hoverBackground"], ["button.background"]],
  ["menu selection vs menu", ["menu.background", "menu.selectionBackground"], ["menu.background"]],
  [
    "quickInputList focus vs quickInput",
    ["quickInput.background", "quickInputList.focusBackground"],
    ["quickInput.background"],
  ],
  [
    "toolbar hover vs sidebar",
    ["sideBar.background", "toolbar.hoverBackground"],
    ["sideBar.background"],
  ],
  [
    "activityBar active vs rest",
    ["activityBar.background", "activityBar.activeBackground"],
    ["activityBar.background"],
  ],
];

const stat = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { min: s[0], p50: q(0.5), max: s[s.length - 1] };
};
const f = (n: number) => n.toFixed(2);

console.log(`themes: ${themes.length}\n\n## (a) non-text contrast, floor 3.0 (WCAG 1.4.11)`);
console.log("| fg over surface | min | median | max | themes < 3.0 |\n|---|---|---|---|---|");
for (const [fg, stack] of NON_TEXT) {
  const vals: number[] = [];
  for (const t of themes) {
    const layers = get(t.colors, stack);
    if (t.colors[fg] === undefined || layers.some(l => l === undefined)) {
      missing.add(fg);
      continue;
    }
    vals.push(wcagContrastRatio(t.colors[fg], layers[layers.length - 1], layers.slice(0, -1)));
  }
  if (!vals.length) {
    console.log(`| ${fg} over ${stack.join(">")} | (key not emitted) | | | |`);
    continue;
  }
  const s = stat(vals);
  console.log(
    `| ${fg} over ${stack.join(">")} | ${f(s.min)} | ${f(s.p50)} | ${f(s.max)} | ${vals.filter(v => v < 3).length}/${vals.length} |`
  );
}

console.log("\n## (b) state vs rest distance (WCAG ratio; OKLab dE x100)");
console.log(
  "| state | ratio min/med/max | dE min/med/max | themes dE < 2 | themes ratio < 1.05 | identical to rest |\n|---|---|---|---|---|---|"
);
for (const [label, a, b] of STATE) {
  const r: number[] = [],
    d: number[] = [];
  let same = 0;
  for (const t of themes) {
    const la = get(t.colors, a),
      lb = get(t.colors, b);
    if (la.some(x => x === undefined) || lb.some(x => x === undefined)) {
      missing.add(label);
      continue;
    }
    const ca = flattenLayers(la),
      cb = flattenLayers(lb);
    const hex = (c: { r: number; g: number; b: number }) =>
      `#${[c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
    if (hex(ca) === hex(cb)) same++;
    r.push(wcagContrastRatio(hex(ca), hex(cb)));
    const oa = rgbToOk(ca),
      ob = rgbToOk(cb);
    d.push(100 * Math.hypot(oa.l - ob.l, oa.a - ob.a, oa.b - ob.b));
  }
  if (!r.length) {
    console.log(`| ${label} | (key not emitted) | | | | |`);
    continue;
  }
  const sr = stat(r),
    sd = stat(d);
  console.log(
    `| ${label} | ${f(sr.min)}/${f(sr.p50)}/${f(sr.max)} | ${f(sd.min)}/${f(sd.p50)}/${f(sd.max)} | ${d.filter(x => x < 2).length}/${d.length} | ${r.filter(x => x < 1.05).length}/${r.length} | ${same}/${r.length} |`
  );
}
if (missing.size)
  console.log(`\nkeys/states with a missing key in at least one theme: ${[...missing].join(", ")}`);
