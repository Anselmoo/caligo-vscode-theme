/**
 * Generate themes and seeds manifests for the Vue landing page
 * Extracts OKLCH values and creates JSON manifests for dynamic theming
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { converter } from "culori";

const THEMES_DIR = join(process.cwd(), "build/themes");
const SEEDS_DIR = join(process.cwd(), "src/seeds");
// Vite serves from public/ directory at root, not web/public/
const OUTPUT_DIR = join(process.cwd(), "public");
const THEMES_MANIFEST = join(OUTPUT_DIR, "themes-manifest.json");
const SEEDS_MANIFEST = join(OUTPUT_DIR, "seeds-manifest.json");
const SEMANTIC_TOKENS_CSS = join(process.cwd(), "src/vue-app/styles/semantic-tokens.css");

// Color converter at module level to avoid recreating on each call
const toOKLCH = converter("oklch");

interface OklchColor {
  l: number;
  c: number;
  h: number;
}

type TokenColor = {
  scope?: string | string[];
  settings?: { foreground?: string };
};

type ThemeJson = {
  colors?: Record<string, string>;
  tokenColors?: TokenColor[];
  _oklchDebug?: Record<string, unknown>;
};

function normalizeHex(hex?: string | null): string | null {
  if (typeof hex !== "string") return null;
  const match = hex.trim().match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (!match) return null;
  return `#${match[1]}`;
}

function pickColor(colors: Record<string, string>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const normalized = normalizeHex(colors[key]);
    if (normalized) return normalized;
  }
  return fallback;
}

function normalizeScopes(t: TokenColor): string[] {
  const s = t.scope;
  if (typeof s === "string") return [s];
  if (Array.isArray(s)) return s.filter((x): x is string => typeof x === "string");
  return [];
}

function firstTokenMatching(tokenColors: TokenColor[], matcher: (scope: string) => boolean) {
  return tokenColors.find(t => normalizeScopes(t).some(matcher));
}

/**
 * Extract a stable set of “core” theme colors from VS Code theme JSON.
 *
 * Note: We intentionally avoid mapping bg2 to sidebar/panel because many themes
 * use the same surface color there. For bg2 we prefer “inner surface” tokens
 * such as input/dropdown backgrounds.
 */
export function extractManifestColors(themeContent: ThemeJson): {
  bg0: string;
  bg1: string;
  bg2: string;
  fg0: string;
  fg1: string;
  fgMuted: string;
  accent: string;
  error: string;
  strings: string;
  types: string;
  functions: string;
  keywords: string;
  decorator: string;
} {
  const colors = themeContent.colors || {};
  const tokenColors = (themeContent.tokenColors || []) as TokenColor[];

  const bg0 = pickColor(colors, ["editor.background"], "#0a0b0f");
  const bg1 = pickColor(
    colors,
    [
      "sideBar.background",
      "panel.background",
      "tab.inactiveBackground",
      "editorGroupHeader.tabsBackground",
    ],
    "#0e0f14"
  );
  const bg2 = pickColor(
    colors,
    [
      "input.background",
      "dropdown.background",
      "quickInput.background",
      "editor.lineHighlightBackground",
      "tab.inactiveBackground",
    ],
    bg1
  );

  const fg0 = pickColor(colors, ["editor.foreground", "foreground"], "#e8e9ed");
  const fg1 = pickColor(colors, ["foreground", "editor.foreground"], "#d5d6da");
  const fgMuted = pickColor(
    colors,
    ["descriptionForeground", "editorLineNumber.foreground"],
    "#6a6b70"
  );
  const accent = pickColor(
    colors,
    [
      "activityBarBadge.background",
      "button.background",
      "focusBorder",
      "statusBarItem.hoverBackground",
      "badge.background",
    ],
    "#7dd3fc"
  );
  const error = pickColor(colors, ["editorError.foreground"], "#f87171");

  // Token extraction (avoid accidental collisions, e.g. Keywords includes storage.type)
  const stringToken = firstTokenMatching(
    tokenColors,
    s => /^(string)(\.|$)/.test(s) || s.includes("punctuation.definition.string")
  );
  const typeToken = firstTokenMatching(
    tokenColors,
    s =>
      /^(entity\.name\.(type|class|struct|enum|interface))(\.|$)/.test(s) ||
      /^(support\.type)(\.|$)/.test(s)
  );
  const functionToken = firstTokenMatching(
    tokenColors,
    s => /^(entity\.name\.function)(\.|$)/.test(s) || /^(support\.function)(\.|$)/.test(s)
  );
  const keywordToken = firstTokenMatching(
    tokenColors,
    s => /^(keyword)(\.|$)/.test(s) || /^(storage\.(type|modifier))(\.|$)/.test(s)
  );
  const decoratorToken = firstTokenMatching(tokenColors, s => s.includes("decorator"));

  const strings = stringToken?.settings?.foreground || "#a9dc76";
  const types = typeToken?.settings?.foreground || "#c075ff";
  const functions = functionToken?.settings?.foreground || "#ffa657";
  const keywords = keywordToken?.settings?.foreground || "#ff79c6";
  const decorator = decoratorToken?.settings?.foreground || "#78dce8";

  return {
    bg0,
    bg1,
    bg2,
    fg0,
    fg1,
    fgMuted,
    accent,
    error,
    strings,
    types,
    functions,
    keywords,
    decorator,
  };
}

function extractFamily(name: string): string {
  const base = name.replace("Caligo-", "");
  const variants = ["Analogous", "Monochromatic", "SplitComplementary", "Triadic"];
  for (const variant of variants) {
    if (base.endsWith(variant)) {
      return base.replace(variant, "");
    }
  }
  return base;
}

function extractVariant(name: string): string {
  if (name.includes("Analogous")) return "analogous";
  if (name.includes("Monochromatic")) return "monochromatic";
  if (name.includes("SplitComplementary")) return "split-complementary";
  if (name.includes("Triadic")) return "triadic";
  return "balanced";
}

function formatDisplayName(name: string): string {
  const family = extractFamily(name);
  const variant = extractVariant(name);
  const familyFormatted = family.replace(/([A-Z])/g, " $1").trim();
  return variant === "balanced"
    ? familyFormatted
    : `${familyFormatted} ${variant
        .split("-")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")}`;
}

/**
 * Convert a hex colour (#rrggbb or #rrggbbaa) to OKLCH, computed from the hex itself.
 *
 * Translucent colours: the hex keeps its alpha bytes, `oklch` describes the OPAQUE colour
 * (culori ignores alpha for l/c/h) and `alpha` carries the opacity separately.
 * We deliberately do not read `_oklchDebug` from the theme JSON: it records the generator's
 * intended values before gamut mapping and alpha handling, so it does not match the hex that ships.
 */
export function hexToOklchAlpha(hex: string): OklchColor & { alpha: number } {
  const color = toOKLCH(hex);
  if (!color) return { l: 0, c: 0, h: 0, alpha: 1 };
  const round = (n: number, digits: number) => Number(n.toFixed(digits));
  return {
    l: round(color.l ?? 0, 4),
    c: round(color.c ?? 0, 4),
    // Achromatic colours have no hue in culori (undefined) → 0
    h: round(color.h ?? 0, 2),
    alpha: round(color.alpha ?? 1, 3),
  };
}

/** OKLCH of the opaque colour only (see hexToOklchAlpha for translucent hex). */
export function hexToOklch(hex: string): OklchColor {
  const { alpha: _alpha, ...oklch } = hexToOklchAlpha(hex);
  return oklch;
}

const CORE_COLOR_LABELS = [
  ["bg0", "Background Primary"],
  ["bg1", "Background Secondary"],
  ["bg2", "Background Tertiary"],
  ["fg0", "Foreground Primary"],
  ["accent", "Accent"],
  ["strings", "Strings"],
  ["types", "Types"],
  ["functions", "Functions"],
  ["keywords", "Keywords"],
  ["decorator", "Decorator"],
] as const;

/** Build the `core` array (spectrum dots) with oklch derived from each entry's own hex. */
export function buildCoreColors(colors: Record<string, string>) {
  return CORE_COLOR_LABELS.map(([key, label]) => {
    const hex = colors[key] as string;
    const { alpha, ...oklch } = hexToOklchAlpha(hex);
    return { key, label, hex, oklch, alpha };
  });
}

function generateThemesManifest() {
  try {
    const files = readdirSync(THEMES_DIR).filter(f => f.endsWith(".json"));
    const themeEntries: Array<{
      key: string;
      seedId: string;
      seedSlug: string;
      seedLabel: string;
      harmonyId: string;
      harmonyLabel: string;
      displayName: string;
      colors: Record<string, string>;
      core: Array<{
        key: string;
        label: string;
        hex: string;
        oklch: OklchColor;
        alpha: number;
      }>;
      oklch: {
        accent: OklchColor;
        bg: OklchColor;
        fg: OklchColor;
      };
    }> = [];

    for (const file of files) {
      const themePath = join(THEMES_DIR, file);
      const themeContent = JSON.parse(readFileSync(themePath, "utf-8")) as ThemeJson;
      const themeName = file.replace(".json", "");

      const family = extractFamily(themeName);
      const variant = extractVariant(themeName);
      const familyFormatted = family.replace(/([A-Z])/g, " $1").trim();

      const {
        bg0,
        bg1,
        bg2,
        fg0,
        fg1,
        fgMuted,
        accent,
        error,
        strings,
        types,
        functions,
        keywords,
        decorator,
      } = extractManifestColors(themeContent);

      const coreColors = buildCoreColors({
        bg0,
        bg1,
        bg2,
        fg0,
        accent,
        strings,
        types,
        functions,
        keywords,
        decorator,
      });

      themeEntries.push({
        key: themeName,
        seedId: family,
        seedSlug: family.toLowerCase().replace(/\s+/g, "-"),
        seedLabel: familyFormatted,
        harmonyId: variant,
        harmonyLabel: variant
          .split("-")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        displayName: formatDisplayName(themeName),
        colors: {
          bg0,
          bg1,
          bg2,
          fg0,
          fg1,
          fgMuted,
          accent,
          error,
          strings,
          types,
          functions,
          keywords,
          decorator,
        },
        core: coreColors,
        oklch: {
          accent: hexToOklch(accent),
          bg: hexToOklch(bg0),
          fg: hexToOklch(fg0),
        },
      });
    }

    themeEntries.sort((a, b) => {
      if (a.seedId !== b.seedId) {
        return a.seedId.localeCompare(b.seedId);
      }
      const variantOrder = [
        "balanced",
        "analogous",
        "monochromatic",
        "split-complementary",
        "triadic",
      ];
      return variantOrder.indexOf(a.harmonyId) - variantOrder.indexOf(b.harmonyId);
    });

    // Extract unique seeds and harmonies
    const seedsSet = new Set<string>();
    const harmoniesSet = new Set<string>();
    themeEntries.forEach(entry => {
      seedsSet.add(entry.seedId);
      harmoniesSet.add(entry.harmonyId);
    });

    const seeds = Array.from(seedsSet).map(family => ({
      id: family,
      slug: family.toLowerCase().replace(/\s+/g, "-"),
      label: family,
    }));

    const harmonies = Array.from(harmoniesSet).map(variant => ({
      id: variant,
      label: variant,
    }));

    // Build themes object with keys
    const themes: Record<string, (typeof themeEntries)[0]> = {};
    themeEntries.forEach(entry => {
      themes[entry.key] = entry;
    });

    // Create ThemeIndex structure
    const manifest = {
      defaultThemeKey: "Caligo-DeepSable",
      seeds,
      harmonies,
      themes,
    };

    mkdirSync(dirname(THEMES_MANIFEST), { recursive: true });
    writeFileSync(THEMES_MANIFEST, JSON.stringify(manifest, null, 2));

    console.log(`✅ Generated themes manifest with ${themeEntries.length} themes`);
    console.log(`   Output: ${THEMES_MANIFEST}`);
  } catch (error) {
    console.error("❌ Failed to generate themes manifest:", error);
    process.exit(1);
  }
}

/**
 * Generate semantic-tokens.css with color formulas derived from base theme colors
 * These tokens define the UI design language for the preview site
 */
function generateSemanticTokensCSS() {
  const css = `/**
 * Semantic Design Tokens
 * Auto-generated from theme manifest - DO NOT EDIT MANUALLY
 *
 * These tokens create a consistent design language for the preview site.
 * All formulas use CSS custom properties set by useTheme composable.
 */

:root {
  /* ========================================
   * SURFACE LAYERS
   * ======================================== */

  /* Base surfaces inherit from theme */
  --surface-base: var(--bg1);
  --surface-elevated: var(--bg2);

  /* Overlays for cards, modals, panels */
  --surface-overlay: color-mix(in oklab, var(--bg2) 80%, var(--bg0) 20%);
  --surface-overlay-strong: color-mix(in oklab, var(--bg2) 60%, var(--bg0) 40%);

  /* ========================================
   * INTERACTIVE STATES
   * ======================================== */

  /* Hover states for buttons, links, cards */
  --interactive-hover: color-mix(in oklab, var(--accent) 15%, var(--bg0) 85%);
  --interactive-hover-strong: color-mix(in oklab, var(--accent) 18%, var(--bg0) 82%);

  /* Active/pressed states */
  --interactive-active: color-mix(in oklab, var(--accent) 25%, var(--bg0) 75%);

  /* Disabled states */
  --interactive-disabled: color-mix(in oklab, var(--fg0) 40%, var(--bg0) 60%);

  /* ========================================
   * TEXT HIERARCHY
   * ======================================== */

  /* Primary text uses chromatic syntax colors (not neutral fg0) */
  --text-primary: var(--syntax-types);
  --text-strong: var(--syntax-keywords);

  /* Muted text (de-emphasized but readable) */
  --text-muted: color-mix(in oklab, var(--syntax-types) 65%, var(--bg1) 35%);
  --text-subtle: color-mix(in oklab, var(--syntax-functions) 60%, var(--bg1) 40%);

  /* Disabled text */
  --text-disabled: color-mix(in oklab, var(--fg0) 40%, var(--bg0) 60%);

  /* ========================================
   * BORDERS
   * ======================================== */

  /* Base border uses accent tint */
  --border-base: color-mix(in oklab, var(--accent) 30%, var(--bg0) 70%);
  --border-strong: color-mix(in oklab, var(--accent) 45%, var(--bg0) 55%);

  /* Muted borders (subtle dividers) */
  --border-muted: color-mix(in oklab, var(--fg0) 10%, transparent 90%);
  --border-subtle: color-mix(in oklab, var(--fg0) 8%, transparent 92%);

  /* ========================================
   * SHADOWS & GLOWS
   * ======================================== */

  /* Shadow tokens using RGB variables */
  --shadow-sm: rgba(var(--bg0-rgb), 0.5);
  --shadow-md: rgba(var(--bg0-rgb), 0.55);
  --shadow-lg: rgba(var(--bg0-rgb), 0.6);

  /* Accent glows for highlights */
  --glow-accent: rgba(var(--accent-rgb), 0.3);
  --glow-accent-strong: rgba(var(--accent-rgb), 0.4);

  /* Syntax color glows for themed effects */
  --glow-keywords: rgba(var(--syntax-keywords-rgb), 0.15);
  --glow-types: rgba(var(--syntax-types-rgb), 0.15);
  --glow-functions: rgba(var(--syntax-functions-rgb), 0.15);
  --glow-strings: rgba(var(--syntax-strings-rgb), 0.15);

  /* ========================================
   * STAT CARD VARIANTS
   * ======================================== */

  /* Background tints for stat cards */
  --stat-bg-keywords: rgba(var(--syntax-keywords-rgb), 0.08);
  --stat-bg-types: rgba(var(--syntax-types-rgb), 0.08);
  --stat-bg-functions: rgba(var(--syntax-functions-rgb), 0.08);

  /* Text colors for stat labels */
  --stat-text-keywords: color-mix(in oklab, var(--syntax-keywords) 60%, var(--bg1) 40%);
  --stat-text-types: color-mix(in oklab, var(--syntax-types) 60%, var(--bg1) 40%);
  --stat-text-functions: color-mix(in oklab, var(--syntax-functions) 60%, var(--bg1) 40%);

  /* ========================================
   * PHILOSOPHY CARD VARIANTS
   * ======================================== */

  /* Card backgrounds using syntax color tints */
  --card-bg-types: rgba(var(--syntax-types-rgb), 0.08);
  --card-bg-keywords: rgba(var(--syntax-keywords-rgb), 0.08);
  --card-bg-functions: rgba(var(--syntax-functions-rgb), 0.08);
  --card-bg-strings: rgba(var(--syntax-strings-rgb), 0.08);
  --card-bg-decorator: rgba(var(--syntax-decorator-rgb), 0.08);
  --card-bg-accent: rgba(var(--accent-rgb), 0.08);
}
`;

  try {
    mkdirSync(dirname(SEMANTIC_TOKENS_CSS), { recursive: true });
    // Keep output identical to the biome-formatted, committed file (no trailing whitespace)
    writeFileSync(SEMANTIC_TOKENS_CSS, css.replace(/[ \t]+$/gm, ""));
    console.log("✅ Generated semantic-tokens.css");
    console.log(`   Output: ${SEMANTIC_TOKENS_CSS}`);
  } catch (error) {
    console.error("❌ Failed to generate semantic-tokens.css:", error);
    process.exit(1);
  }
}

function generateSeedsManifest() {
  try {
    const files = readdirSync(SEEDS_DIR).filter(f => f.endsWith(".json"));
    const manifest = [];

    for (const file of files) {
      const seedPath = join(SEEDS_DIR, file);
      const seedContent = JSON.parse(readFileSync(seedPath, "utf-8"));

      manifest.push({
        id: seedContent.id,
        displayName: seedContent.displayName,
        background: seedContent.background,
        accent: seedContent.accent,
      });
    }

    manifest.sort((a, b) => a.id.localeCompare(b.id));

    writeFileSync(SEEDS_MANIFEST, JSON.stringify(manifest, null, 2));

    console.log(`✅ Generated seeds manifest with ${manifest.length} seeds`);
    console.log(`   Output: ${SEEDS_MANIFEST}`);
  } catch (error) {
    console.error("❌ Failed to generate seeds manifest:", error);
    process.exit(1);
  }
}

// Run both generators only when executed as a script (avoid side effects on import)
const isEntry = (() => {
  const self = fileURLToPath(import.meta.url);
  const argv1 = process.argv[1] ? resolve(process.argv[1]) : "";
  return argv1 !== "" && resolve(self) === argv1;
})();

if (isEntry) {
  generateThemesManifest();
  generateSeedsManifest();
  generateSemanticTokensCSS();
}
