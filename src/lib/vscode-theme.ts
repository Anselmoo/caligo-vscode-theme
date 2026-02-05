import { withAlpha } from "./color.js";
import { deriveIntentSemanticTokenColors } from "./intent-layers.js";
import type { DerivedPalette } from "./palette.js";
import { SEMANTIC_COLOR_KEYS } from "./semantic-colors.js";
import { deriveSemanticTokenColors, type SemanticTokenColors } from "./semantic-tokens.js";

export type VscodeThemeJson = {
  $schema: string;
  name: string;
  type: "dark" | "light";
  colors: Record<string, string>;
  tokenColors: Array<{
    name?: string;
    scope?: string | string[];
    settings: Record<string, unknown>;
  }>;
  semanticHighlighting?: boolean;
  semanticTokenColors?: SemanticTokenColors;
  _oklchDebug?: Record<string, number[]>;
};

export function buildVscodeThemeJson(p: DerivedPalette): VscodeThemeJson {
  const modeSuffix = p.mode && p.mode !== "Balanced" ? ` — ${p.mode}` : "";
  const name = `Caligo (${p.seed.displayName}${modeSuffix})`;

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE COLORS (UI elements, surfaces, text)
  // ═══════════════════════════════════════════════════════════════════════════
  const colors: Record<string, string> = {
    focusBorder: p.accent,

    foreground: p.fg1,
    descriptionForeground: p.fgMuted,

    "editor.background": p.bg0,
    "editor.foreground": p.fg0,
    "editorLineNumber.foreground": withAlpha(p.fgMuted, 0.55),
    "editorLineNumber.activeForeground": withAlpha(p.fg0, 0.8),
    "editorCursor.foreground": p.accentSoft,

    // Selections: prefer the dark-twin accent ramp so the editor doesn't feel
    // "lit up" by the primary accent.
    "editor.selectionBackground": withAlpha(p.accentMuted, 0.35),
    "editor.inactiveSelectionBackground": withAlpha(p.accentMuted, 0.22),
    "editor.selectionHighlightBackground": withAlpha(p.accentSubtle, 0.55),

    // Use the precomputed selection color (accent-based) for line highlight to ensure contrast
    "editor.lineHighlightBackground": p.selection,
    "editor.wordHighlightBackground": withAlpha(p.bg2, 0.85),
    "editor.wordHighlightStrongBackground": withAlpha(p.bg2, 0.95),

    "editorIndentGuide.background": withAlpha(p.border, 0.35),
    "editorIndentGuide.activeBackground": withAlpha(p.border, 0.65),

    "editorGroupHeader.tabsBackground": p.bg0,
    "tab.activeBackground": p.bg0,
    "tab.inactiveBackground": p.bg1,
    "tab.activeForeground": p.fg0,
    "tab.inactiveForeground": withAlpha(p.fg1, 0.8),

    "sideBar.background": p.bg1,
    "sideBar.foreground": p.fg1,
    "sideBarTitle.foreground": p.fg0,

    "activityBar.background": p.bg1,
    "activityBar.foreground": p.fg0,
    "activityBar.inactiveForeground": withAlpha(p.fg1, 0.65),

    "statusBar.background": p.bg1,
    "statusBar.foreground": p.fg1,
    "statusBarItem.hoverBackground": withAlpha(p.bg2, 0.85),

    "titleBar.activeBackground": p.bg1,
    "titleBar.activeForeground": p.fg1,
    "titleBar.inactiveBackground": p.bg1,
    "titleBar.inactiveForeground": withAlpha(p.fg1, 0.7),

    "panel.background": p.bg1,
    "panel.border": withAlpha(p.border, 0.35),
    "panelTitle.activeForeground": p.fg0,
    "panelTitle.inactiveForeground": withAlpha(p.fg1, 0.7),

    "input.background": p.bg2,
    "input.foreground": p.fg0,
    "input.placeholderForeground": withAlpha(p.fgMuted, 0.8),

    "dropdown.background": p.bg2,
    "dropdown.foreground": p.fg0,

    "list.hoverBackground": withAlpha(p.bg2, 0.65),
    "list.activeSelectionBackground": withAlpha(p.accentMuted, 0.35),
    "list.inactiveSelectionBackground": withAlpha(p.accentMuted, 0.22),
    "list.activeSelectionForeground": p.fg0,
    "list.inactiveSelectionForeground": p.fg1,

    "badge.background": withAlpha(p.accentSubtle, 0.85),
    "badge.foreground": p.fg0,

    // Terminal ANSI (use decorative hue wheel - these are syntax colors, not semantic)
    "terminal.foreground": p.fg0,
    "terminal.background": p.bg0,
    "terminal.ansiBlack": p.bg2,
    "terminal.ansiRed": p.hueRed,
    "terminal.ansiGreen": p.hueGreen,
    "terminal.ansiYellow": p.hueYellow,
    "terminal.ansiBlue": p.hueBlue,
    "terminal.ansiMagenta": p.huePurple,
    "terminal.ansiCyan": p.hueCyan,
    "terminal.ansiWhite": p.fg0,
    "terminal.ansiBrightBlack": withAlpha(p.fgMuted, 0.65),
    "terminal.ansiBrightRed": p.hueRed,
    "terminal.ansiBrightGreen": p.hueGreen,
    "terminal.ansiBrightYellow": p.hueYellow,
    "terminal.ansiBrightBlue": p.hueBlue,
    "terminal.ansiBrightMagenta": p.huePurple,
    "terminal.ansiBrightCyan": p.hueCyan,
    "terminal.ansiBrightWhite": p.fg0,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC COLORS - Apply FIXED hues for error/warning/success/info
  // These colors have USER EXPECTATIONS (errors = red, success = green, etc.)
  // ═══════════════════════════════════════════════════════════════════════════

  // Helper to determine color type from key name
  const getSemanticColor = (key: string): string | null => {
    // Handle background vs foreground variants
    const isBackground = key.toLowerCase().includes("background");
    const isBorder = key.toLowerCase().includes("border");

    // Type-safe includes check using Array.prototype.some
    const isError = (SEMANTIC_COLOR_KEYS.error as readonly string[]).includes(key);
    const isWarning = (SEMANTIC_COLOR_KEYS.warning as readonly string[]).includes(key);
    const isSuccess = (SEMANTIC_COLOR_KEYS.success as readonly string[]).includes(key);
    const isInfo = (SEMANTIC_COLOR_KEYS.info as readonly string[]).includes(key);

    if (isError) {
      if (isBackground) return p.semantic.errorBg;
      if (isBorder) return p.semantic.errorMuted;
      return p.semantic.error;
    }
    if (isWarning) {
      if (isBackground) return p.semantic.warningBg;
      if (isBorder) return p.semantic.warningMuted;
      return p.semantic.warning;
    }
    if (isSuccess) {
      if (isBackground) return p.semantic.successBg;
      if (isBorder) return p.semantic.successMuted;
      return p.semantic.success;
    }
    if (isInfo) {
      if (isBackground) return p.semantic.infoBg;
      if (isBorder) return p.semantic.infoMuted;
      return p.semantic.info;
    }
    return null;
  };

  // Apply all semantic color mappings
  for (const category of Object.values(SEMANTIC_COLOR_KEYS)) {
    for (const key of category) {
      const color = getSemanticColor(key);
      if (color) {
        colors[key] = color;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL ERROR/WARNING OVERRIDES (with proper semantic colors)
  // ═══════════════════════════════════════════════════════════════════════════
  colors.errorForeground = p.semantic.error;
  colors["editorError.foreground"] = p.semantic.error;
  colors["editorWarning.foreground"] = p.semantic.warning;
  colors["editorInfo.foreground"] = p.semantic.info;
  colors["editorHint.foreground"] = p.semantic.infoMuted;

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN COLORS (Syntax highlighting - honor harmony variants when present)
  // These are aesthetic choices that can shift with theme accent or harmony mode
  // ═══════════════════════════════════════════════════════════════════════════

  const syntax =
    p.harmony.mode === "none"
      ? {
          strings: p.hueGreen,
          numbers: p.hueOrange,
          keywords: p.huePurple,
          functions: p.hueBlue,
          types: p.hueCyan,
          constants: p.hueYellow,
        }
      : {
          strings: p.harmony.strings,
          numbers: p.harmony.numbers,
          keywords: p.harmony.keywords,
          functions: p.harmony.functions,
          types: p.harmony.types,
          constants: p.harmony.constants,
        };

  const tokenColors: VscodeThemeJson["tokenColors"] = [
    {
      name: "Comments",
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: withAlpha(p.fgMuted, 0.75),
        fontStyle: "italic",
      },
    },
    {
      name: "Strings",
      scope: ["string", "punctuation.definition.string"],
      settings: { foreground: syntax.strings },
    },
    {
      name: "Numbers",
      scope: ["constant.numeric"],
      settings: { foreground: syntax.numbers },
    },
    {
      name: "Keywords",
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: { foreground: syntax.keywords },
    },
    {
      name: "Functions",
      scope: ["entity.name.function", "support.function"],
      settings: { foreground: syntax.functions },
    },
    {
      name: "Types",
      scope: ["entity.name.type", "support.type"],
      settings: { foreground: syntax.types },
    },
    {
      name: "Variables",
      scope: ["variable", "support.variable"],
      settings: { foreground: p.fg0 },
    },
    {
      name: "Constants",
      scope: ["constant", "variable.other.constant"],
      settings: { foreground: syntax.constants },
    },
    {
      name: "Operators",
      scope: ["keyword.operator", "punctuation.separator", "punctuation.accessor"],
      settings: { foreground: withAlpha(p.fg0, 0.85) },
    },
  ];

  // Convert OKLCH debug data to format expected by manifest generator
  const _oklchDebug: Record<string, number[]> = {
    bg0: [p.debug.oklch.bg0.l, p.debug.oklch.bg0.c, p.debug.oklch.bg0.h],
    bg1: [p.debug.oklch.bg1.l, p.debug.oklch.bg1.c, p.debug.oklch.bg1.h],
    bg2: [p.debug.oklch.bg2.l, p.debug.oklch.bg2.c, p.debug.oklch.bg2.h],
    fg0: [p.debug.oklch.fg0.l, p.debug.oklch.fg0.c, p.debug.oklch.fg0.h],
    fg1: [p.debug.oklch.fg1.l, p.debug.oklch.fg1.c, p.debug.oklch.fg1.h],
    fgMuted: [p.debug.oklch.fgMuted.l, p.debug.oklch.fgMuted.c, p.debug.oklch.fgMuted.h],
    accent: [p.debug.oklch.accent.l, p.debug.oklch.accent.c, p.debug.oklch.accent.h],
    accentSoft: [
      p.debug.oklch.accentSoft.l,
      p.debug.oklch.accentSoft.c,
      p.debug.oklch.accentSoft.h,
    ],
    accentMuted: [
      p.debug.oklch.accentMuted.l,
      p.debug.oklch.accentMuted.c,
      p.debug.oklch.accentMuted.h,
    ],
    accentSubtle: [
      p.debug.oklch.accentSubtle.l,
      p.debug.oklch.accentSubtle.c,
      p.debug.oklch.accentSubtle.h,
    ],
    hueRed: [p.debug.oklch.hueRed.l, p.debug.oklch.hueRed.c, p.debug.oklch.hueRed.h],
    hueOrange: [p.debug.oklch.hueOrange.l, p.debug.oklch.hueOrange.c, p.debug.oklch.hueOrange.h],
    hueYellow: [p.debug.oklch.hueYellow.l, p.debug.oklch.hueYellow.c, p.debug.oklch.hueYellow.h],
    hueGreen: [p.debug.oklch.hueGreen.l, p.debug.oklch.hueGreen.c, p.debug.oklch.hueGreen.h],
    hueCyan: [p.debug.oklch.hueCyan.l, p.debug.oklch.hueCyan.c, p.debug.oklch.hueCyan.h],
    hueBlue: [p.debug.oklch.hueBlue.l, p.debug.oklch.hueBlue.c, p.debug.oklch.hueBlue.h],
    huePurple: [p.debug.oklch.huePurple.l, p.debug.oklch.huePurple.c, p.debug.oklch.huePurple.h],
    border: [p.debug.oklch.border.l, p.debug.oklch.border.c, p.debug.oklch.border.h],
    selectionBase: [
      p.debug.oklch.selectionBase.l,
      p.debug.oklch.selectionBase.c,
      p.debug.oklch.selectionBase.h,
    ],
  };

  // Add OKLCH values for syntax colors (from harmony palette)
  if (p.harmony) {
    _oklchDebug.strings = [
      p.harmony.debug.strings.l,
      p.harmony.debug.strings.c,
      p.harmony.debug.strings.h,
    ];
    _oklchDebug.types = [p.harmony.debug.types.l, p.harmony.debug.types.c, p.harmony.debug.types.h];
    _oklchDebug.functions = [
      p.harmony.debug.functions.l,
      p.harmony.debug.functions.c,
      p.harmony.debug.functions.h,
    ];
    _oklchDebug.keywords = [
      p.harmony.debug.keywords.l,
      p.harmony.debug.keywords.c,
      p.harmony.debug.keywords.h,
    ];
    _oklchDebug.numbers = [
      p.harmony.debug.numbers.l,
      p.harmony.debug.numbers.c,
      p.harmony.debug.numbers.h,
    ];
    _oklchDebug.variables = [
      p.harmony.debug.variables.l,
      p.harmony.debug.variables.c,
      p.harmony.debug.variables.h,
    ];
    _oklchDebug.constants = [
      p.harmony.debug.constants.l,
      p.harmony.debug.constants.c,
      p.harmony.debug.constants.h,
    ];
    _oklchDebug.attributes = [
      p.harmony.debug.attributes.l,
      p.harmony.debug.attributes.c,
      p.harmony.debug.attributes.h,
    ];
    _oklchDebug.tags = [p.harmony.debug.tags.l, p.harmony.debug.tags.c, p.harmony.debug.tags.h];
  }

  // Add semantic color OKLCH values
  _oklchDebug.error = [
    p.semantic.debug.error.l,
    p.semantic.debug.error.c,
    p.semantic.debug.error.h,
  ];
  _oklchDebug.warning = [
    p.semantic.debug.warning.l,
    p.semantic.debug.warning.c,
    p.semantic.debug.warning.h,
  ];
  _oklchDebug.success = [
    p.semantic.debug.success.l,
    p.semantic.debug.success.c,
    p.semantic.debug.success.h,
  ];
  _oklchDebug.info = [p.semantic.debug.info.l, p.semantic.debug.info.c, p.semantic.debug.info.h];

  return {
    $schema: "vscode://schemas/color-theme",
    name,
    type: "dark",
    colors,
    tokenColors,
    semanticHighlighting: true,
    semanticTokenColors: p.intent
      ? deriveIntentSemanticTokenColors(p.intent, p.fgMuted)
      : deriveSemanticTokenColors(p),
    _oklchDebug,
  };
}

export function generateVSCodeTheme(p: DerivedPalette) {
  return buildVscodeThemeJson(p);
}
