/**
 * Generate theme screenshots using Playwright
 *
 * This creates minimal, reproducible screenshots for each theme by rendering
 * TypeScript code in a browser using the theme's color tokens.
 * Much faster and more reliable than VS Code automation for CI.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveTokenColor } from "../src/lib/screenshot-token-colors";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const THEMES_DIR = join(PROJECT_ROOT, "themes");
const OUTPUT_DIR = join(PROJECT_ROOT, "public", "screenshots");

// TypeScript sample code to display in screenshots
const SAMPLE_CODE = [
  "// Caligo Theme Preview",
  'import { useState, useEffect } from "react";',
  "",
  "interface ThemeConfig {",
  "  name: string;",
  '  variant: "balanced" | "analogous" | "triadic";',
  "  colors: Record<string, string>;",
  "}",
  "",
  'type ColorMode = "light" | "dark" | "system";',
  "",
  "const DEFAULT_THEMES: ThemeConfig[] = [",
  '  { name: "Aurora", variant: "balanced", colors: {} },',
  "];",
  "",
  "/**",
  " * Custom hook for theme management",
  " * @param initialMode - The initial color mode",
  " */",
  'export function useTheme(initialMode: ColorMode = "dark") {',
  "  const [mode, setMode] = useState<ColorMode>(initialMode);",
  "  const [theme, setTheme] = useState<ThemeConfig | null>(null);",
  "",
  "  useEffect(() => {",
  '    const stored = localStorage.getItem("theme");',
  "    if (stored) {",
  "      setTheme(JSON.parse(stored));",
  "    }",
  "  }, []);",
  "",
  "  const applyTheme = async (config: ThemeConfig) => {",
  `    console.log(\`Applying theme: ${"${"}config.name}\`);`,
  "    setTheme(config);",
  '    localStorage.setItem("theme", JSON.stringify(config));',
  "  };",
  "",
  "  return { mode, setMode, theme, applyTheme };",
  "}",
  "",
  "export class ThemeManager {",
  "  private static instance: ThemeManager;",
  "  private themes: Map<string, ThemeConfig> = new Map();",
  "",
  "  private constructor() {",
  "    DEFAULT_THEMES.forEach(t => this.themes.set(t.name, t));",
  "  }",
  "",
  "  static getInstance(): ThemeManager {",
  "    if (!ThemeManager.instance) {",
  "      ThemeManager.instance = new ThemeManager();",
  "    }",
  "    return ThemeManager.instance;",
  "  }",
  "",
  "  getTheme(name: string): ThemeConfig | undefined {",
  "    return this.themes.get(name);",
  "  }",
  "}",
].join("\n");

interface ThemeColors {
  "editor.background": string;
  "editor.foreground": string;
  "editorLineNumber.foreground"?: string;
  [key: string]: string | undefined;
}

interface ThemeJson {
  name: string;
  colors: ThemeColors;
  tokenColors?: {
    scope?: string | string[];
    settings?: {
      foreground?: string;
      fontStyle?: string;
    };
  }[];
  semanticHighlighting?: boolean;
  semanticTokenColors?: Record<
    string,
    | string
    | {
        foreground?: string;
      }
  >;
}

function loadTheme(themePath: string): ThemeJson {
  const content = readFileSync(themePath, "utf-8");
  return JSON.parse(content);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightTypeScript(code: string, _colors: Record<string, string>): string {
  const lines = code.split("\n");

  return lines
    .map(line => {
      let highlighted = escapeHtml(line);

      // Comments (must be first to avoid highlighting inside comments)
      highlighted = highlighted.replace(
        /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        '<span class="comment">$1</span>'
      );

      // Strings
      highlighted = highlighted.replace(
        /(&quot;[^&]*&quot;|'[^']*'|`[^`]*`)/g,
        '<span class="string">$1</span>'
      );

      // Keywords
      highlighted = highlighted.replace(
        /\b(import|export|from|const|let|var|function|class|interface|type|return|if|else|for|while|async|await|new|static|private|extends|implements|typeof|instanceof|void|null|undefined|true|false)\b/g,
        '<span class="keyword">$1</span>'
      );

      // Types (capitalized words)
      highlighted = highlighted.replace(
        /\b([A-Z][a-zA-Z0-9]*(?:&lt;[^&]*&gt;)?)\b/g,
        '<span class="type">$1</span>'
      );

      // Functions (word followed by parenthesis)
      highlighted = highlighted.replace(
        /\b([a-z][a-zA-Z0-9]*)\s*\(/g,
        '<span class="function">$1</span>('
      );

      // Numbers
      highlighted = highlighted.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="number">$1</span>');

      // Decorators
      highlighted = highlighted.replace(
        /@([a-zA-Z][a-zA-Z0-9]*)/g,
        '<span class="decorator">@$1</span>'
      );

      return `      <div class="line">${highlighted || "&nbsp;"}</div>`;
    })
    .join("\n");
}

function generateHTML(theme: ThemeJson): string {
  const colors = theme.colors;
  const bg = colors["editor.background"] || "#1e1e1e";
  const fg = colors["editor.foreground"] || "#d4d4d4";
  const lineNum = colors["editorLineNumber.foreground"] || "#858585";

  // Extract token colors
  const keyword = resolveTokenColor(theme, ["keyword"], ["keyword", "storage.type"], "#569cd6");
  const string = resolveTokenColor(theme, ["string"], ["string"], "#ce9178");
  const comment = resolveTokenColor(theme, ["comment"], ["comment"], "#6a9955");
  const type = resolveTokenColor(
    theme,
    ["type", "class", "interface", "enum", "struct", "typeParameter"],
    ["entity.name.type", "support.type"],
    "#4ec9b0"
  );
  const func = resolveTokenColor(
    theme,
    ["function", "method"],
    ["entity.name.function", "support.function"],
    "#dcdcaa"
  );
  const decorator = resolveTokenColor(
    theme,
    ["decorator"],
    ["entity.name.decorator", "meta.decorator"],
    "#c586c0"
  );

  // Syntax highlight the code
  const highlightedCode = highlightTypeScript(SAMPLE_CODE, {
    keyword,
    string,
    comment,
    type,
    func,
    decorator,
    fg,
  });

  const lineNumbers = SAMPLE_CODE.split("\n")
    .map((_, i) => `      <div class="line">${i + 1}</div>`)
    .join("\n");

  return (
    "<!DOCTYPE html>\n" +
    "<html>\n" +
    "<head>\n" +
    '  <meta charset="UTF-8">\n' +
    "  <style>\n" +
    "    * { margin: 0; padding: 0; box-sizing: border-box; }\n" +
    "    body {\n" +
    "      font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;\n" +
    "      font-size: 13px;\n" +
    "      line-height: 1.5;\n" +
    "      background: " +
    bg +
    ";\n" +
    "      color: " +
    fg +
    ";\n" +
    "      padding: 16px;\n" +
    "    }\n" +
    "    .editor {\n" +
    "      display: flex;\n" +
    "      background: " +
    bg +
    ";\n" +
    "      border-radius: 8px;\n" +
    "      overflow: hidden;\n" +
    "    }\n" +
    "    .line-numbers {\n" +
    "      color: " +
    lineNum +
    ";\n" +
    "      text-align: right;\n" +
    "      padding-right: 16px;\n" +
    "      user-select: none;\n" +
    "      min-width: 40px;\n" +
    "    }\n" +
    "    .code {\n" +
    "      flex: 1;\n" +
    "      white-space: pre;\n" +
    "      overflow: hidden;\n" +
    "    }\n" +
    "    .line { height: 19.5px; }\n" +
    "    .keyword { color: " +
    keyword +
    "; }\n" +
    "    .string { color: " +
    string +
    "; }\n" +
    "    .comment { color: " +
    comment +
    "; font-style: italic; }\n" +
    "    .type { color: " +
    type +
    "; }\n" +
    "    .function { color: " +
    func +
    "; }\n" +
    "    .decorator { color: " +
    decorator +
    "; }\n" +
    "  </style>\n" +
    "</head>\n" +
    "<body>\n" +
    '  <div class="editor">\n' +
    '    <div class="line-numbers">\n' +
    lineNumbers +
    "\n" +
    "    </div>\n" +
    '    <div class="code">\n' +
    highlightedCode +
    "\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</body>\n" +
    "</html>"
  );
}

function slugifyThemeName(name: string): string {
  // Convert "Caligo (Deep Sable — Balanced)" to "caligo-deepsable-balanced"
  return name
    .toLowerCase()
    .replace(/[()—–-]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

async function generateScreenshots() {
  console.log("📸 Starting theme screenshot generation...\n");
  const { chromium } = await import("playwright");

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load all theme files
  const themeFiles = readdirSync(THEMES_DIR).filter(f => f.endsWith(".json"));

  console.log(`Found ${themeFiles.length} themes\n`);

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 2, // Retina quality
  });

  const page = await context.newPage();

  let generated = 0;
  let failed = 0;

  for (const themeFile of themeFiles) {
    const themePath = join(THEMES_DIR, themeFile);

    try {
      const theme = loadTheme(themePath);
      const html = generateHTML(theme);

      // Load HTML
      await page.setContent(html, { waitUntil: "networkidle" });

      // Generate filename from theme name
      const slug = slugifyThemeName(theme.name);
      const filename = `${slug}-typescript.png`;
      const outputPath = join(OUTPUT_DIR, filename);

      // Capture screenshot
      await page.screenshot({
        path: outputPath,
        type: "png",
        fullPage: false,
      });

      console.log(`✅ ${theme.name} → ${filename}`);
      generated++;
    } catch (error) {
      console.error(`❌ Failed: ${themeFile}`, error);
      failed++;
    }
  }

  await browser.close();

  console.log("\n🎉 Screenshot generation complete!");
  console.log(`   Generated: ${generated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
}

const isEntry = (() => {
  const self = fileURLToPath(import.meta.url);
  const argv1 = process.argv[1] ? resolve(process.argv[1]) : "";
  return argv1 !== "" && resolve(self) === argv1;
})();

if (isEntry) {
  generateScreenshots().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
