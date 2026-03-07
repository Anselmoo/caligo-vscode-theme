import { withAlpha } from "./color.js";
import { pickReadableForeground } from "./contrast.js";
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

    // Editor features
    "editor.foldBackground": withAlpha(p.bg2, 0.1),
    "editor.findMatchBackground": p.accentMuted,
    "editor.findMatchHighlightBackground": withAlpha(p.accentMuted, 0.5),
    "editor.findMatchBorder": p.accent,
    "editor.linkedEditingBackground": withAlpha(p.accent, 0.07),
    "editorBracketMatch.background": withAlpha(p.hueGreen, 0.25),
    "editorBracketMatch.border": withAlpha(p.hueGreen, 0.6),
    "editorWhitespace.foreground": withAlpha(p.fgMuted, 0.3),
    "editorWidget.background": p.bg2,
    "editorWidget.foreground": p.fg0,
    "editorWidget.border": p.border,

    // Inlay hints
    "editorInlayHint.background": withAlpha(p.fgMuted, 0.2),
    "editorInlayHint.foreground": p.fgMuted,
    "editorInlayHint.typeBackground": withAlpha(p.fgMuted, 0.2),
    "editorInlayHint.typeForeground": p.fgMuted,
    "editorInlayHint.parameterBackground": withAlpha(p.fgMuted, 0.2),
    "editorInlayHint.parameterForeground": p.fgMuted,

    "editorIndentGuide.background": withAlpha(p.border, 0.35),
    "editorIndentGuide.activeBackground": withAlpha(p.border, 0.65),

    "editorGroupHeader.tabsBackground": p.bg0,
    "tab.activeBackground": p.bg0,
    "tab.inactiveBackground": p.bg1,
    "tab.activeForeground": p.fg0,
    "tab.inactiveForeground": withAlpha(p.fg1, 0.8),
    // Tab & editor group enhancements
    "tab.border": p.border,
    "tab.activeBorderTop": p.accent,
    "tab.unfocusedActiveBorderTop": p.border,
    "tab.hoverBackground": p.bg0,
    "tab.unfocusedHoverBackground": withAlpha(p.bg2, 0.1),
    "editorGroupHeader.tabsBorder": p.border,
    "editorGroup.border": p.border,

    "sideBar.background": p.bg1,
    "sideBar.foreground": p.fg1,
    "sideBarTitle.foreground": p.fg0,

    "activityBar.background": p.bg1,
    "activityBar.foreground": p.fg0,
    "activityBar.inactiveForeground": withAlpha(p.fg1, 0.65),

    "statusBar.background": p.bg1,
    "statusBar.foreground": p.fg1,
    "statusBarItem.hoverBackground": withAlpha(p.bg2, 0.85),

    // Interactive elements
    // Buttons — foreground is chosen dynamically to maximize contrast
    // by picking the higher-contrast option against the accent or secondary background.
    "button.background": p.accent,
    "button.foreground": pickReadableForeground(p.accent, p.fg0, p.bg0),
    "button.hoverBackground": p.accentSoft,
    "button.secondaryBackground": p.bg2,
    "button.secondaryForeground": pickReadableForeground(p.bg2, p.fg1, p.bg0),
    "button.secondaryHoverBackground": withAlpha(p.bg2, 0.8),

    // Checkbox
    "checkbox.background": p.bg2,
    "checkbox.border": p.border,
    "checkbox.foreground": p.fg0,

    // Dropdown additions
    "dropdown.border": p.border,
    "dropdown.listBackground": p.bg2,

    // Progress
    "progressBar.background": p.accent,

    "titleBar.activeBackground": p.bg1,
    "titleBar.activeForeground": p.fg1,
    "titleBar.inactiveBackground": p.bg1,
    "titleBar.inactiveForeground": withAlpha(p.fg1, 0.7),

    "panel.background": p.bg1,
    "panel.border": withAlpha(p.border, 0.35),
    "panelTitle.activeForeground": p.fg0,
    "panelTitle.inactiveForeground": withAlpha(p.fg1, 0.7),

    // Debug & peek view
    "debugToolBar.background": p.bg2,
    "debugToolBar.border": p.border,
    "editor.stackFrameHighlightBackground": withAlpha(p.accentMuted, 0.4),
    "editor.focusedStackFrameHighlightBackground": withAlpha(p.semantic.successMuted, 0.4),
    "peekView.border": p.accent,
    "peekViewEditor.background": withAlpha(p.bg2, 0.5),
    "peekViewEditor.matchHighlightBackground": withAlpha(p.accentMuted, 0.4),
    "peekViewResult.background": p.bg1,
    "peekViewResult.fileForeground": p.fg0,
    "peekViewResult.lineForeground": p.fg1,
    "peekViewResult.matchHighlightBackground": withAlpha(p.accentMuted, 0.4),
    "peekViewResult.selectionBackground": withAlpha(p.accentMuted, 0.35),
    "peekViewResult.selectionForeground": p.fg0,
    "peekViewTitle.background": p.bg2,
    "peekViewTitleLabel.foreground": p.fg0,
    "peekViewTitleDescription.foreground": p.fgMuted,

    "input.background": p.bg2,
    "input.foreground": p.fg0,
    "input.placeholderForeground": withAlpha(p.fgMuted, 0.8),

    "dropdown.background": p.bg2,
    "dropdown.foreground": p.fg0,

    // Settings & welcome page
    "settings.headerForeground": p.fg0,
    "settings.modifiedItemIndicator": p.accentMuted,
    "settings.dropdownBackground": p.bg2,
    "settings.dropdownForeground": p.fg0,
    "settings.dropdownBorder": p.border,
    "settings.checkboxBackground": p.bg2,
    "settings.checkboxForeground": p.fg0,
    "settings.checkboxBorder": p.border,
    "settings.textInputBackground": p.bg2,
    "settings.textInputForeground": p.fg0,
    "settings.textInputBorder": p.border,
    "settings.numberInputBackground": p.bg2,
    "settings.numberInputForeground": p.fg0,
    "settings.numberInputBorder": p.border,
    "welcomePage.background": p.bg0,
    "welcomePage.tileBackground": p.bg1,
    "welcomePage.tileHoverBackground": p.bg2,
    "welcomePage.tileBorder": p.border,
    "welcomePage.progress.foreground": p.accent,
    "welcomePage.progress.background": p.bg2,

    "list.hoverBackground": withAlpha(p.bg2, 0.65),
    "list.activeSelectionBackground": withAlpha(p.accentMuted, 0.35),
    "list.inactiveSelectionBackground": withAlpha(p.accentMuted, 0.22),
    "list.activeSelectionForeground": p.fg0,
    "list.inactiveSelectionForeground": p.fg1,

    // List & tree enhancements
    "list.focusForeground": p.fg0,
    "list.focusBackground": withAlpha(p.accent, 0.15),
    "list.inactiveFocusBackground": withAlpha(p.accent, 0.15),
    "list.focusOutline": p.accent,
    "list.focusAndSelectionOutline": p.accent,
    "list.highlightForeground": p.accent,
    "list.hoverForeground": p.fg0,
    "tree.indentGuidesStroke": p.border,

    // Scrollbar & minimap
    "scrollbar.shadow": withAlpha(p.bg0, 0.2),
    "scrollbarSlider.background": withAlpha(p.fgMuted, 0.2),
    "scrollbarSlider.hoverBackground": withAlpha(p.fgMuted, 0.24),
    "scrollbarSlider.activeBackground": withAlpha(p.fgMuted, 0.28),
    "minimapSlider.background": withAlpha(p.fgMuted, 0.2),
    "minimapSlider.hoverBackground": withAlpha(p.fgMuted, 0.24),
    "minimapSlider.activeBackground": withAlpha(p.fgMuted, 0.28),
    "editorOverviewRuler.border": p.bg0,

    "badge.background": withAlpha(p.accentSubtle, 0.85),
    "badge.foreground": p.fg0,

    // Notifications
    "notifications.foreground": p.fg0,
    "notifications.background": p.bg1,
    "notifications.border": p.border,
    "notificationCenterHeader.foreground": p.fgMuted,
    "notificationCenterHeader.background": p.bg2,
    "notificationLink.foreground": p.accent,

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
    "terminal.findMatchBackground": withAlpha(p.accentMuted, 0.5),
    "terminal.findMatchBorder": p.accent,
    "terminal.findMatchHighlightBackground": withAlpha(p.accentSubtle, 0.35),
    "terminal.findMatchHighlightBorder": withAlpha(p.accent, 0.65),

    // Bracket pair colorization - use decorative hue wheel for visual distinction
    "editorBracketHighlight.foreground1": p.hueCyan,
    "editorBracketHighlight.foreground2": p.hueGreen,
    "editorBracketHighlight.foreground3": p.hueYellow,
    "editorBracketHighlight.foreground4": p.hueRed,
    "editorBracketHighlight.foreground5": p.huePurple,
    "editorBracketHighlight.foreground6": p.hueBlue,
    "editorBracketHighlight.unexpectedBracket.foreground": p.fgMuted,
    "editorBracketPairGuide.activeBackground1": withAlpha(p.hueCyan, 0.55),
    "editorBracketPairGuide.activeBackground2": withAlpha(p.hueGreen, 0.55),
    "editorBracketPairGuide.activeBackground3": withAlpha(p.hueYellow, 0.55),
    "editorBracketPairGuide.activeBackground4": withAlpha(p.hueRed, 0.55),
    "editorBracketPairGuide.activeBackground5": withAlpha(p.huePurple, 0.55),
    "editorBracketPairGuide.activeBackground6": withAlpha(p.hueBlue, 0.55),
    "editorBracketPairGuide.background1": withAlpha(p.hueCyan, 0.3),
    "editorBracketPairGuide.background2": withAlpha(p.hueGreen, 0.3),
    "editorBracketPairGuide.background3": withAlpha(p.hueYellow, 0.3),
    "editorBracketPairGuide.background4": withAlpha(p.hueRed, 0.3),
    "editorBracketPairGuide.background5": withAlpha(p.huePurple, 0.3),
    "editorBracketPairGuide.background6": withAlpha(p.hueBlue, 0.3),

    // Symbol icons - map to harmony palette for consistent theming
    "symbolIcon.arrayForeground": p.harmony.types,
    "symbolIcon.booleanForeground": p.harmony.constants,
    "symbolIcon.classForeground": p.harmony.types,
    "symbolIcon.colorForeground": p.hueCyan,
    "symbolIcon.constantForeground": p.harmony.constants,
    "symbolIcon.constructorForeground": p.harmony.functions,
    "symbolIcon.enumeratorForeground": p.harmony.types,
    "symbolIcon.enumeratorMemberForeground": p.harmony.constants,
    "symbolIcon.eventForeground": p.fgMuted,
    "symbolIcon.fieldForeground": p.harmony.variables,
    "symbolIcon.fileForeground": p.accentMuted,
    "symbolIcon.folderForeground": p.accentMuted,
    "symbolIcon.functionForeground": p.harmony.functions,
    "symbolIcon.interfaceForeground": p.harmony.types,
    "symbolIcon.keyForeground": p.harmony.constants,
    "symbolIcon.keywordForeground": p.harmony.keywords,
    "symbolIcon.methodForeground": p.harmony.functions,
    "symbolIcon.moduleForeground": p.harmony.types,
    "symbolIcon.namespaceForeground": p.harmony.types,
    "symbolIcon.nullForeground": p.fgMuted,
    "symbolIcon.numberForeground": p.harmony.numbers,
    "symbolIcon.objectForeground": p.harmony.types,
    "symbolIcon.operatorForeground": p.fgMuted,
    "symbolIcon.packageForeground": p.harmony.types,
    "symbolIcon.propertyForeground": p.harmony.variables,
    "symbolIcon.referenceForeground": p.harmony.constants,
    "symbolIcon.snippetForeground": p.hueCyan,
    "symbolIcon.stringForeground": p.harmony.strings,
    "symbolIcon.structForeground": p.harmony.types,
    "symbolIcon.textForeground": p.fg1,
    "symbolIcon.typeParameterForeground": p.harmony.types,
    "symbolIcon.unitForeground": p.harmony.constants,
    "symbolIcon.variableForeground": p.harmony.variables,
    disabledForeground: withAlpha(p.fgMuted, 0.65),
    "icon.foreground": p.fg1,
    "widget.shadow": withAlpha(p.bg0, 0.35),
    "selection.background": withAlpha(p.accentMuted, 0.35),
    "sash.hoverBorder": p.accent,
    "statusBar.border": p.border,
    "activityBar.activeBorder": p.accent,
    "sideBar.border": p.border,
    "editorStickyScroll.background": p.bg1,
    "editorStickyScroll.border": p.border,
    "editorStickyScroll.shadow": withAlpha(p.bg0, 0.35),
    "editorStickyScrollGutter.background": p.bg1,
    "editorStickyScrollHover.background": withAlpha(p.bg2, 0.8),
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
    // Gutter indicators need visible solid colors, not transparent backgrounds
    // These are the colored bars in the editor gutter showing git changes
    const isGutter =
      key.startsWith("editorGutter.") ||
      key.startsWith("minimapGutter.") ||
      key.startsWith("diffEditorGutter.");

    // Type-safe includes check using Array.prototype.some
    const isError = (SEMANTIC_COLOR_KEYS.error as readonly string[]).includes(key);
    const isWarning = (SEMANTIC_COLOR_KEYS.warning as readonly string[]).includes(key);
    const isSuccess = (SEMANTIC_COLOR_KEYS.success as readonly string[]).includes(key);
    const isInfo = (SEMANTIC_COLOR_KEYS.info as readonly string[]).includes(key);

    if (isError) {
      // Gutter colors use muted with high alpha for visibility (like Dracula/Primer)
      if (isGutter) return withAlpha(p.semantic.errorMuted, 0.8);
      if (isBackground) return p.semantic.errorBg;
      if (isBorder) return p.semantic.errorMuted;
      return p.semantic.error;
    }
    if (isWarning) {
      if (isGutter) return withAlpha(p.semantic.warningMuted, 0.8);
      if (isBackground) return p.semantic.warningBg;
      if (isBorder) return p.semantic.warningMuted;
      return p.semantic.warning;
    }
    if (isSuccess) {
      if (isGutter) return withAlpha(p.semantic.successMuted, 0.8);
      if (isBackground) return p.semantic.successBg;
      if (isBorder) return p.semantic.successMuted;
      return p.semantic.success;
    }
    if (isInfo) {
      if (isGutter) return withAlpha(p.semantic.infoMuted, 0.8);
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
          variables: p.harmony.variables,
          constants: p.hueYellow,
          attributes: p.huePurple,
          tags: p.hueRed,
        }
      : {
          strings: p.harmony.strings,
          numbers: p.harmony.numbers,
          keywords: p.harmony.keywords,
          functions: p.harmony.functions,
          types: p.harmony.types,
          variables: p.harmony.variables,
          constants: p.harmony.constants,
          attributes: p.harmony.attributes,
          tags: p.harmony.tags,
        };

  const tokenColors: VscodeThemeJson["tokenColors"] = [
    {
      name: "Comments",
      scope: ["comment", "punctuation.definition.comment", "string.comment"],
      settings: {
        foreground: withAlpha(p.fgMuted, 0.75),
        fontStyle: "italic",
      },
    },
    {
      name: "Doc Comment Keywords",
      scope: ["comment.block.documentation keyword", "comment.block.documentation storage.type"],
      settings: { foreground: syntax.attributes },
    },
    {
      name: "Doc Comment Types",
      scope: [
        "comment.block.documentation entity.name.type",
        "comment.block.documentation entity.name.class",
        "comment.block.documentation entity.name.interface",
      ],
      settings: { foreground: syntax.types, fontStyle: "italic" },
    },
    {
      name: "Doc Comment Parameters",
      scope: [
        "comment.block.documentation variable",
        "comment.block.documentation entity.name.variable",
      ],
      settings: { foreground: syntax.variables, fontStyle: "italic" },
    },
    {
      name: "Doc Comment Type Brackets",
      scope: ["comment.block.documentation entity.name.type punctuation.definition.bracket"],
      settings: { foreground: syntax.types },
    },
    {
      name: "Strings",
      scope: ["string"],
      settings: { foreground: syntax.strings },
    },
    {
      name: "String Punctuation",
      scope: [
        "punctuation.definition.string.begin",
        "punctuation.definition.string.end",
        "punctuation.definition.string",
      ],
      settings: { foreground: withAlpha(syntax.strings, 0.85) },
    },
    {
      name: "String Interpolation",
      scope: ["string variable", "variable.other.interpolation"],
      settings: { foreground: syntax.variables },
    },
    {
      name: "String Escapes",
      scope: ["constant.character.escape", "constant.character.escape.regexp"],
      settings: { foreground: syntax.constants },
    },
    {
      name: "Template Interpolation",
      scope: [
        "punctuation.definition.template-expression.begin",
        "punctuation.definition.template-expression.end",
        "punctuation.section.embedded",
      ],
      settings: { foreground: p.accent },
    },
    {
      name: "Docstrings",
      scope: ["string.quoted.docstring.multi", "string.quoted.docstring"],
      settings: { foreground: withAlpha(p.fgMuted, 0.75) },
    },
    {
      name: "Regex",
      scope: ["source.regexp", "string.regexp"],
      settings: { foreground: syntax.strings },
    },
    {
      name: "Regex Character Classes",
      scope: ["string.regexp.character-class", "constant.other.character-class.regexp"],
      settings: { foreground: syntax.types },
    },
    {
      name: "Regex Escapes",
      scope: ["string.regexp constant.character.escape", "constant.character.escape.regexp"],
      settings: { foreground: p.hueGreen, fontStyle: "bold" },
    },
    {
      name: "Regex Groups",
      scope: ["punctuation.definition.group.regexp"],
      settings: { foreground: syntax.constants },
    },
    {
      name: "Regex Assertions",
      scope: ["punctuation.definition.group.assertion.regexp"],
      settings: { foreground: p.hueRed },
    },
    {
      name: "Regex Character Class Punctuation",
      scope: ["punctuation.definition.character-class.regexp"],
      settings: { foreground: syntax.types },
    },
    {
      name: "Regex Delimiters",
      scope: [
        "string.regexp punctuation.definition.string.begin",
        "string.regexp punctuation.definition.string.end",
      ],
      settings: { foreground: p.hueRed },
    },
    {
      name: "Regex Lookahead",
      scope: ["meta.assertion.look-ahead.regexp", "meta.assertion.look-behind.regexp"],
      settings: { foreground: p.hueGreen },
    },
    {
      name: "Numbers",
      scope: ["constant.numeric", "constant.character.numeric"],
      settings: { foreground: syntax.numbers },
    },
    {
      name: "Keywords",
      scope: [
        "keyword",
        "keyword.control",
        "keyword.other",
        "keyword.operator",
        "storage.type",
        "storage.modifier",
        "storage.class",
        "storage.type.class",
        "storage.type.function",
        "storage.type.struct",
        "storage.type.enum",
      ],
      settings: { foreground: syntax.keywords },
    },
    {
      name: "New Keyword",
      scope: ["keyword.control.new", "keyword.operator.new"],
      settings: { foreground: syntax.keywords, fontStyle: "bold" },
    },
    {
      name: "Storage Imports",
      scope: ["storage.modifier.package", "storage.modifier.import"],
      settings: { foreground: p.fg0 },
    },
    {
      name: "Functions",
      scope: [
        "entity.name.function",
        "entity.name.method",
        "support.function",
        "support.method",
        "variable.function",
        "meta.function-call",
        "meta.function-call.generic",
      ],
      settings: { foreground: syntax.functions },
    },
    {
      name: "Function Parameters",
      scope: [
        "variable.parameter",
        "variable.parameter.function",
        "entity.name.variable.parameter",
      ],
      settings: { foreground: syntax.variables, fontStyle: "italic" },
    },
    {
      name: "Decorators",
      scope: [
        "meta.decorator variable.other.readwrite",
        "meta.decorator variable.other.property",
        "meta.decorator punctuation.definition",
      ],
      settings: { foreground: syntax.attributes, fontStyle: "italic" },
    },
    {
      name: "Types",
      scope: [
        "entity.name.type",
        "entity.name.class",
        "entity.name.struct",
        "entity.name.enum",
        "entity.name.interface",
        "entity.name.trait",
      ],
      settings: { foreground: syntax.types },
    },
    {
      name: "Inherited Classes",
      scope: ["entity.other.inherited-class"],
      settings: { foreground: syntax.types, fontStyle: "italic" },
    },
    {
      name: "Type Parameters",
      scope: ["entity.name.type.type-parameter"],
      settings: { foreground: p.accentMuted },
    },
    {
      name: "Type Annotations",
      scope: ["storage.type.annotation", "meta.type.annotation", "meta.return-type"],
      settings: { foreground: syntax.types, fontStyle: "italic" },
    },
    {
      name: "Variables",
      scope: [
        "variable",
        "variable.other.readwrite",
        "meta.definition.variable",
        "entity.name.variable",
      ],
      settings: { foreground: syntax.variables },
    },
    {
      name: "this/self/super",
      scope: ["variable.language", "keyword.other.this"],
      settings: { foreground: syntax.keywords, fontStyle: "italic" },
    },
    {
      name: "Constants",
      scope: [
        "constant",
        "constant.language",
        "constant.character",
        "variable.other.constant",
        "variable.other.enummember",
        "support.constant",
      ],
      settings: { foreground: syntax.constants },
    },
    {
      name: "Support Types",
      scope: ["support", "support.type", "support.class", "support.other.namespace"],
      settings: { foreground: syntax.types, fontStyle: "italic" },
    },
    {
      name: "Support Functions",
      scope: ["support.function", "support.method", "support.function.any-method"],
      settings: { foreground: syntax.functions },
    },
    {
      name: "Support Constants",
      scope: ["support.constant"],
      settings: { foreground: syntax.constants },
    },
    {
      name: "Support Variables",
      scope: ["support.variable"],
      settings: { foreground: syntax.variables },
    },
    {
      name: "Operators",
      scope: [
        "keyword.operator",
        "punctuation.accessor",
        "punctuation.terminator",
        "punctuation.section",
      ],
      settings: { foreground: withAlpha(p.fg0, 0.85) },
    },
    {
      name: "Punctuation Separators",
      scope: [
        "punctuation.separator",
        "punctuation.separator.key-value",
        "punctuation.separator.namespace",
      ],
      settings: { foreground: p.accent },
    },
    {
      name: "Tags",
      scope: [
        "entity.name.tag",
        "entity.name.tag.html",
        "entity.name.tag.xml",
        "entity.name.tag.jsx",
        "entity.name.tag.tsx",
        "meta.tag",
      ],
      settings: { foreground: syntax.tags },
    },
    {
      name: "Attributes",
      scope: [
        "entity.other.attribute-name",
        "entity.other.attribute-name.class",
        "entity.other.attribute-name.id",
        "entity.other.attribute-name.jsx",
        "entity.other.attribute-name.tsx",
        "meta.attribute",
      ],
      settings: { foreground: syntax.attributes },
    },
    {
      name: "Property Names",
      scope: [
        "support.type.property-name",
        "support.type.property-name.json",
        "meta.property-name",
        "meta.property-name.css",
        "meta.property-name.scss",
        "meta.module-reference",
      ],
      settings: { foreground: syntax.attributes },
    },
    {
      name: "Markup Headings",
      scope: ["markup.heading", "entity.name.section"],
      settings: { foreground: p.accent, fontStyle: "bold" },
    },
    {
      name: "Markup Bold",
      scope: ["markup.bold", "punctuation.definition.bold"],
      settings: { foreground: p.hueOrange, fontStyle: "bold" },
    },
    {
      name: "Markup Italic",
      scope: ["markup.italic", "punctuation.definition.italic"],
      settings: { foreground: p.hueYellow, fontStyle: "italic" },
    },
    {
      name: "Markup Underline",
      scope: ["markup.underline"],
      settings: { foreground: p.fg0, fontStyle: "underline" },
    },
    {
      name: "Markup Strikethrough",
      scope: ["markup.strikethrough"],
      settings: { foreground: p.fg0, fontStyle: "strikethrough" },
    },
    {
      name: "Markup Links",
      scope: ["markup.underline.link", "markup.underline.link.image"],
      settings: { foreground: p.hueCyan, fontStyle: "underline" },
    },
    {
      name: "Markup Inline Code",
      scope: ["markup.inline.raw", "markup.raw.inline"],
      settings: { foreground: syntax.strings },
    },
    {
      name: "Markup Quotes",
      scope: ["markup.quote"],
      settings: { foreground: p.hueYellow, fontStyle: "italic" },
    },
    {
      name: "Markup Inserted",
      scope: ["markup.inserted", "markup.inserted.diff", "markup.inserted.git_gutter"],
      settings: { foreground: p.hueGreen },
    },
    {
      name: "Markup Deleted",
      scope: ["markup.deleted", "markup.deleted.diff", "markup.deleted.git_gutter"],
      settings: { foreground: p.hueRed },
    },
    {
      name: "Markup Changed",
      scope: ["markup.changed", "markup.changed.diff", "markup.changed.git_gutter"],
      settings: { foreground: p.hueOrange },
    },
    {
      name: "Markup Ignored",
      scope: ["markup.ignored", "markup.untracked"],
      settings: { foreground: p.fgMuted },
    },
    {
      name: "Markup List Punctuation",
      scope: ["punctuation.definition.list.begin.markdown"],
      settings: { foreground: p.hueCyan },
    },
    {
      name: "Markup Reference Links",
      scope: ["constant.other.reference.link", "string.other.link"],
      settings: { foreground: p.hueCyan, fontStyle: "underline" },
    },
    {
      name: "Serialization Keys",
      scope: ["entity.name.tag.yaml", "variable.other.key.toml"],
      settings: { foreground: syntax.types },
    },
    {
      name: "Serialization Dates",
      scope: ["constant.other.date", "constant.other.timestamp"],
      settings: { foreground: syntax.numbers },
    },
    {
      name: "Serialization Aliases",
      scope: ["variable.other.alias.yaml"],
      settings: { foreground: syntax.strings, fontStyle: "italic underline" },
    },
    {
      name: "Makefile Targets",
      scope: ["entity.name.function.target.makefile"],
      settings: { foreground: syntax.functions },
    },
    {
      name: "Invalid",
      scope: ["invalid"],
      settings: { foreground: p.semantic.error, fontStyle: "italic underline" },
    },
    {
      name: "Invalid Broken",
      scope: ["invalid.broken"],
      settings: { foreground: p.semantic.error, fontStyle: "italic" },
    },
    {
      name: "Invalid Deprecated",
      scope: ["invalid.deprecated"],
      settings: { foreground: p.fgMuted, fontStyle: "italic underline" },
    },
    {
      name: "Invalid Illegal",
      scope: ["invalid.illegal"],
      settings: { foreground: p.semantic.error, fontStyle: "italic underline" },
    },
    {
      name: "Invalid Unimplemented",
      scope: ["invalid.unimplemented"],
      settings: { foreground: p.semantic.warning, fontStyle: "italic" },
    },
    {
      name: "Message Error",
      scope: ["message.error"],
      settings: { foreground: p.semantic.error },
    },
    {
      name: "Carriage Return",
      scope: ["carriage-return"],
      settings: { foreground: p.semantic.error, fontStyle: "bold underline" },
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
