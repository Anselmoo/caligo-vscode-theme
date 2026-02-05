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

function oklchToObject(arr: number[]): OklchColor {
  return { l: arr[0] || 0, c: arr[1] || 0, h: arr[2] || 0 };
}

/**
 * Convert hex color to OKLCH values
 */
function hexToOklch(hex: string): OklchColor {
  const oklch = toOKLCH(hex);

  if (!oklch || typeof oklch !== "object") {
    return { l: 0, c: 0, h: 0 };
  }

  const color = oklch as Partial<OklchColor>;
  return {
    l: color.l ?? 0,
    c: color.c ?? 0,
    h: color.h ?? 0,
  };
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
        oklch: { l: number; c: number; h: number };
      }>;
      oklch: {
        accent: { l: number; c: number; h: number };
        bg: { l: number; c: number; h: number };
        fg: { l: number; c: number; h: number };
      };
    }> = [];

    for (const file of files) {
      const themePath = join(THEMES_DIR, file);
      const themeContent = JSON.parse(readFileSync(themePath, "utf-8")) as ThemeJson;
      const themeName = file.replace(".json", "");

      // Extract OKLCH debug info if available
      const oklchDebug: Record<string, number[] | undefined> =
        (themeContent._oklchDebug as Record<string, number[]>) || {};
      // Note: themeContent.colors is accessed through extractManifestColors(themeContent)

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

      // Build core colors array (used for spectrum dots)
      const coreColors = [
        {
          key: "bg0",
          label: "Background Primary",
          hex: bg0,
          oklch: oklchDebug.bg0 ? oklchToObject(oklchDebug.bg0) : hexToOklch(bg0),
        },
        {
          key: "bg1",
          label: "Background Secondary",
          hex: bg1,
          oklch: oklchDebug.bg1 ? oklchToObject(oklchDebug.bg1) : hexToOklch(bg1),
        },
        {
          key: "bg2",
          label: "Background Tertiary",
          hex: bg2,
          oklch: oklchDebug.bg2 ? oklchToObject(oklchDebug.bg2) : hexToOklch(bg2),
        },
        {
          key: "fg0",
          label: "Foreground Primary",
          hex: fg0,
          oklch: oklchDebug.fg0 ? oklchToObject(oklchDebug.fg0) : hexToOklch(fg0),
        },
        {
          key: "accent",
          label: "Accent",
          hex: accent,
          oklch: oklchDebug.accent ? oklchToObject(oklchDebug.accent) : hexToOklch(accent),
        },
        {
          key: "strings",
          label: "Strings",
          hex: strings,
          oklch: oklchDebug.strings ? oklchToObject(oklchDebug.strings) : hexToOklch(strings),
        },
        {
          key: "types",
          label: "Types",
          hex: types,
          oklch: oklchDebug.types ? oklchToObject(oklchDebug.types) : hexToOklch(types),
        },
        {
          key: "functions",
          label: "Functions",
          hex: functions,
          oklch: oklchDebug.functions ? oklchToObject(oklchDebug.functions) : hexToOklch(functions),
        },
        {
          key: "keywords",
          label: "Keywords",
          hex: keywords,
          oklch: oklchDebug.keywords ? oklchToObject(oklchDebug.keywords) : hexToOklch(keywords),
        },
        {
          key: "decorator",
          label: "Decorator",
          hex: decorator,
          oklch: oklchDebug.decorator ? oklchToObject(oklchDebug.decorator) : hexToOklch(decorator),
        },
      ];

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
          accent: oklchDebug.accent ? oklchToObject(oklchDebug.accent) : hexToOklch(accent),
          bg: oklchDebug.bg0 ? oklchToObject(oklchDebug.bg0) : hexToOklch(bg0),
          fg: oklchDebug.fg0 ? oklchToObject(oklchDebug.fg0) : hexToOklch(fg0),
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
    writeFileSync(SEMANTIC_TOKENS_CSS, css);
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
