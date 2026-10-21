/**
 * (4) Pair registry and ratchet gate.
 *
 * Contract (area "math", src/lib/contrast-pairs.ts):
 *   type ContrastKind = "text" | "ui"
 *   interface ContrastPair {
 *     fg: string;                         // VS Code `colors` key
 *     bg: string;                         // `colors` key, may be translucent
 *     base?: string | readonly string[];  // `colors` key(s) under bg, bottom -> top; bottom opaque in every theme
 *     min: number;                        // WCAG 2.x ratio; text >= 4.5, ui >= 3
 *     kind: ContrastKind;
 *     note?: string;
 *   }
 *   const WCAG_MIN: { readonly text: 4.5; readonly ui: 3 }
 *   const CONTRAST_PAIRS: readonly ContrastPair[]
 *   const CONTRAST_EXEMPT_FOREGROUNDS: Readonly<Record<string, string>>  // key -> reason (disabled, decoration, ...)
 *   function pairId(p: { fg: string; bg: string; base?: string | readonly string[] }): string
 *       // `${fg}|${[...base, bg].join(">")}` e.g. "editor.foreground|editor.background>editor.selectionBackground"
 *   function evaluateThemeContrast(theme: ThemeJson): PairResult[]
 *       // registry pairs, plus one pair per tokenColors rule and per semanticTokenColors selector
 *       // that has a foreground, each over editor.background, kind "text", min 4.5:
 *       //   id `token:${rule.name ?? [scope].flat().join(",")}|editor.background`
 *       //   id `semantic:${selector}|editor.background`
 *       // throws if a registry key is missing from theme.colors or a stack bottom is translucent.
 *   interface PairResult {
 *     id: string; kind: ContrastKind; min: number;
 *     fg: string;          // fg hex exactly as emitted (may be #RRGGBBAA)
 *     layers: string[];    // background hexes exactly as emitted, bottom -> top
 *     wcag: number;        // composited WCAG ratio (src/lib/contrast.ts)
 *     apcaLc: number;      // composited |Lc|
 *     pass: boolean;       // wcag >= min, raw float, no rounding
 *   }
 *
 * Contract (area "consumers", scripts/contrast-known-violations.json):
 *   { "version": 1, "violations": [ { "pair": "<pairId>", "themes": ["Caligo-X", ...] | "*", "reason": "..." } ] }
 *   Granularity is (pair, theme). "*" means every shipped theme. Every failing (pair, theme) must be
 *   listed; every listed (pair, theme) must still fail (no stale entries). The list can only shrink.
 */
import { describe, expect, it } from "vitest";
import {
  loadModule,
  loadShippedThemes,
  oracleApcaSigned,
  oracleWcag,
  readText,
  type ThemeFile,
  TOL,
} from "./_oracle";

type ContrastKind = "text" | "ui";
type ContrastPair = {
  fg: string;
  bg: string;
  base?: string | readonly string[];
  min: number;
  kind: ContrastKind;
  note?: string;
};
type PairResult = {
  id: string;
  kind: ContrastKind;
  min: number;
  fg: string;
  layers: string[];
  wcag: number;
  apcaLc: number;
  pass: boolean;
};
type PairsModule = {
  WCAG_MIN: { text: number; ui: number };
  CONTRAST_PAIRS: readonly ContrastPair[];
  CONTRAST_EXEMPT_FOREGROUNDS: Readonly<Record<string, string>>;
  pairId: (p: Pick<ContrastPair, "fg" | "bg" | "base">) => string;
  evaluateThemeContrast: (theme: unknown) => PairResult[];
};
type Ratchet = {
  version: number;
  violations: Array<{ pair: string; themes: string[] | "*"; reason: string }>;
};

const PAIRS_PATH = "src/lib/contrast-pairs.ts";
const RATCHET_PATH = "scripts/contrast-known-violations.json";

/** The four pairs scripts/test-contrast.ts gates today; the registry must keep gating them. */
const LEGACY_GATED = [
  "editor.foreground|editor.background",
  "sideBar.foreground|sideBar.background",
  "descriptionForeground|sideBar.background",
  "editorLineNumber.foreground|editor.background",
];

/** A `colors` key that paints text or a glyph and therefore needs a pair or an exemption. */
const FOREGROUND_KEY = (k: string) =>
  /(^|\.)[A-Za-z]*[Ff]oreground\d*$/.test(k) || /^terminal\.ansi/.test(k);

const baseList = (b: ContrastPair["base"]): string[] => (b === undefined ? [] : [b].flat());

async function pairsModule(): Promise<PairsModule> {
  const { mod, error } = await loadModule<PairsModule>(PAIRS_PATH);
  expect(error, `${PAIRS_PATH} must exist and load (pair registry is missing)`).toBeUndefined();
  for (const name of [
    "WCAG_MIN",
    "CONTRAST_PAIRS",
    "CONTRAST_EXEMPT_FOREGROUNDS",
    "pairId",
    "evaluateThemeContrast",
  ]) {
    expect(mod && name in (mod as object), `${PAIRS_PATH} must export ${name}`).toBe(true);
  }
  return mod as PairsModule;
}

function shippedThemes(): ThemeFile[] {
  const themes = loadShippedThemes();
  expect(
    themes.length,
    "no themes/Caligo-*.json found; run `npm run generate` before this gate"
  ).toBeGreaterThan(0);
  return themes;
}

const colorsOf = (t: ThemeFile) => (t.json.colors ?? {}) as Record<string, string>;

describe("contrast-truth / pair registry shape", () => {
  it("exports a non-empty, typed, duplicate-free registry", async () => {
    const m = await pairsModule();
    expect(m.WCAG_MIN).toEqual({ text: 4.5, ui: 3 });
    expect(Array.isArray(m.CONTRAST_PAIRS)).toBe(true);
    expect(m.CONTRAST_PAIRS.length).toBeGreaterThan(LEGACY_GATED.length);
    const ids = m.CONTRAST_PAIRS.map(p => m.pairId(p));
    expect(new Set(ids).size, "duplicate pair ids").toBe(ids.length);
    for (const p of m.CONTRAST_PAIRS) {
      const id = m.pairId(p);
      expect(["text", "ui"], id).toContain(p.kind);
      expect(typeof p.fg === "string" && typeof p.bg === "string", id).toBe(true);
      expect(Number.isFinite(p.min), id).toBe(true);
      expect(p.min, `${id}: min below WCAG floor for ${p.kind}`).toBeGreaterThanOrEqual(
        m.WCAG_MIN[p.kind]
      );
    }
  });

  it("pairId joins base and bg bottom -> top", async () => {
    const m = await pairsModule();
    expect(m.pairId({ fg: "a", bg: "b" })).toBe("a|b");
    expect(m.pairId({ fg: "a", bg: "c", base: "b" })).toBe("a|b>c");
    expect(m.pairId({ fg: "a", bg: "d", base: ["b", "c"] })).toBe("a|b>c>d");
  });

  it("keeps gating the four pairs the old gate checked", async () => {
    const m = await pairsModule();
    const ids = new Set(m.CONTRAST_PAIRS.map(p => m.pairId(p)));
    for (const id of LEGACY_GATED) expect(ids.has(id), id).toBe(true);
  });

  it("every exemption has a reason and is not also gated", async () => {
    const m = await pairsModule();
    const gatedFg = new Set(m.CONTRAST_PAIRS.map(p => p.fg));
    for (const [key, reason] of Object.entries(m.CONTRAST_EXEMPT_FOREGROUNDS)) {
      expect(typeof reason === "string" && reason.trim().length >= 10, `${key}: reason`).toBe(true);
      expect(gatedFg.has(key), `${key} is both exempt and gated`).toBe(false);
    }
  });
});

describe("contrast-truth / registry against the emitted themes", () => {
  it("references only keys every shipped theme emits (no typos, no dead exemptions)", async () => {
    const m = await pairsModule();
    const missing: string[] = [];
    for (const t of shippedThemes()) {
      const colors = colorsOf(t);
      for (const p of m.CONTRAST_PAIRS) {
        for (const k of [p.fg, p.bg, ...baseList(p.base)]) {
          if (!(k in colors)) missing.push(`${t.name}: ${m.pairId(p)} -> ${k}`);
        }
      }
      for (const k of Object.keys(m.CONTRAST_EXEMPT_FOREGROUNDS)) {
        if (!(k in colors)) missing.push(`${t.name}: exempt ${k}`);
      }
    }
    expect(missing.slice(0, 20)).toEqual([]);
  });

  it("covers every foreground the themes emit (pair or reasoned exemption)", async () => {
    const m = await pairsModule();
    const covered = new Set([
      ...m.CONTRAST_PAIRS.map(p => p.fg),
      ...Object.keys(m.CONTRAST_EXEMPT_FOREGROUNDS),
    ]);
    const uncovered = new Set<string>();
    for (const t of shippedThemes()) {
      for (const k of Object.keys(colorsOf(t))) {
        if (FOREGROUND_KEY(k) && !covered.has(k)) uncovered.add(k);
      }
    }
    expect([...uncovered].sort()).toEqual([]);
  });

  it("declares a base for every background that is translucent in any theme", async () => {
    const m = await pairsModule();
    const bad: string[] = [];
    for (const t of shippedThemes()) {
      const colors = colorsOf(t);
      for (const p of m.CONTRAST_PAIRS) {
        const stack = [...baseList(p.base), p.bg].map(k => colors[k]).filter(Boolean);
        if (stack.length && stack[0].length === 9 && !/ff$/i.test(stack[0])) {
          bad.push(`${t.name}: ${m.pairId(p)} bottom ${stack[0]}`);
        }
      }
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });
});

describe("contrast-truth / evaluateThemeContrast", () => {
  it("evaluates every shipped theme, ids unique, numbers equal to the independent oracle", async () => {
    const m = await pairsModule();
    const problems: string[] = [];
    for (const t of shippedThemes()) {
      const results = m.evaluateThemeContrast(t.json);
      const ids = results.map(r => r.id);
      if (new Set(ids).size !== ids.length) problems.push(`${t.name}: duplicate result ids`);
      for (const r of results) {
        const w = oracleWcag(r.fg, r.layers);
        const lc = Math.abs(oracleApcaSigned(r.fg, r.layers));
        if (Math.abs(r.wcag - w) > TOL) problems.push(`${t.name} ${r.id}: wcag ${r.wcag} vs ${w}`);
        if (Math.abs(r.apcaLc - lc) > TOL)
          problems.push(`${t.name} ${r.id}: Lc ${r.apcaLc} vs ${lc}`);
        if (r.pass !== r.wcag >= r.min) problems.push(`${t.name} ${r.id}: pass flag wrong`);
      }
    }
    expect(problems.slice(0, 20)).toEqual([]);
  });

  it("scores registry pairs from the emitted colors and token pairs over editor.background", async () => {
    const m = await pairsModule();
    const t = shippedThemes()[0];
    const colors = colorsOf(t);
    const results = new Map(m.evaluateThemeContrast(t.json).map(r => [r.id, r]));
    for (const p of m.CONTRAST_PAIRS) {
      const r = results.get(m.pairId(p));
      expect(r, m.pairId(p)).toBeDefined();
      expect(r?.fg).toBe(colors[p.fg]);
      expect(r?.layers).toEqual([...baseList(p.base), p.bg].map(k => colors[k]));
      expect(r?.min).toBe(p.min);
      expect(r?.kind).toBe(p.kind);
    }
    const tokens = (t.json.tokenColors ?? []) as Array<{
      name?: string;
      scope?: string | string[];
      settings?: { foreground?: string };
    }>;
    for (const rule of tokens.filter(r => r.settings?.foreground)) {
      const id = `token:${rule.name ?? [rule.scope ?? ""].flat().join(",")}|editor.background`;
      const r = results.get(id);
      expect(r, id).toBeDefined();
      expect(r?.fg).toBe(rule.settings?.foreground);
      expect(r?.layers).toEqual([colors["editor.background"]]);
      expect(r?.kind).toBe("text");
      expect(r?.min).toBe(4.5);
    }
    const semantic = (t.json.semanticTokenColors ?? {}) as Record<
      string,
      string | { foreground?: string }
    >;
    for (const [sel, v] of Object.entries(semantic)) {
      const fg = typeof v === "string" ? v : v?.foreground;
      if (!fg) continue;
      const r = results.get(`semantic:${sel}|editor.background`);
      expect(r, sel).toBeDefined();
      expect(r?.fg).toBe(fg);
    }
  });
});

describe("contrast-truth / ratchet gate", () => {
  it("every failing (pair, theme) is a known violation with a reason, and no entry is stale", async () => {
    const m = await pairsModule();
    const raw = readText(RATCHET_PATH);
    expect(raw, `${RATCHET_PATH} must exist`).toBeDefined();
    const ratchet = JSON.parse(raw as string) as Ratchet;
    expect(ratchet.version).toBe(1);
    expect(Array.isArray(ratchet.violations)).toBe(true);

    const themes = shippedThemes();
    const themeNames = new Set(themes.map(t => t.name));
    const failing = new Set<string>();
    const knownIds = new Set<string>();
    for (const t of themes) {
      for (const r of m.evaluateThemeContrast(t.json)) {
        knownIds.add(r.id);
        if (!r.pass) failing.add(`${r.id}@${t.name}`);
      }
    }

    const listed = new Set<string>();
    const malformed: string[] = [];
    const seenPairs = new Set<string>();
    for (const v of ratchet.violations) {
      if (seenPairs.has(v.pair)) malformed.push(`duplicate entry ${v.pair}`);
      seenPairs.add(v.pair);
      if (!knownIds.has(v.pair)) malformed.push(`unknown pair id ${v.pair}`);
      if (typeof v.reason !== "string" || v.reason.trim().length < 10) {
        malformed.push(`${v.pair}: reason missing or too short`);
      }
      const names = v.themes === "*" ? [...themeNames] : v.themes;
      if (!Array.isArray(names) || names.length === 0) malformed.push(`${v.pair}: no themes`);
      for (const n of names ?? []) {
        if (!themeNames.has(n)) malformed.push(`${v.pair}: unknown theme ${n}`);
        listed.add(`${v.pair}@${n}`);
      }
    }
    expect(malformed.slice(0, 20)).toEqual([]);

    const unlisted = [...failing].filter(k => !listed.has(k)).sort();
    const stale = [...listed].filter(k => !failing.has(k)).sort();
    expect(
      unlisted.slice(0, 30),
      `${unlisted.length} failing pairs not in ${RATCHET_PATH}`
    ).toEqual([]);
    expect(stale.slice(0, 30), `${stale.length} stale entries in ${RATCHET_PATH}`).toEqual([]);
  });
});
