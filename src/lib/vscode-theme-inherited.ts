/**
 * vscode-theme-inherited — colors VS Code itself defines as "default to some other color".
 *
 * Agents-window, modern-UI and chat surfaces are registered upstream with defaults such as
 * `agentsChatInput.border` -> `input.border`. A theme that omits them still renders, but through
 * VS Code's own Dark+/Light+ fallback chain, which can bind them to a color the theme never chose.
 * This module restates each chain explicitly, on top of the colors the theme has already settled,
 * so every key is emitted and every surface keeps following the Caligo palette.
 *
 * Where VS Code's default is a fixed hex (voice glow, git-style diff tints, brand icons) the value
 * is derived from a palette role instead, so no literal color enters the generator.
 *
 * Keys are only ever added: a key the base or extended map already sets is never overwritten.
 * Deprecated ids (`chat.inputWorkingBorderColor2/3`, `quickInput.list.focusBackground`, ...) are
 * not emitted here; the coverage gate (tests/verification/vscode-color-coverage.test.ts) exempts them.
 */

import { scaleAlpha, withAlpha } from "./color.js";
import type { DerivedPalette } from "./palette.js";

export function buildInheritedColors(
  p: DerivedPalette,
  settled: Readonly<Record<string, string>>
): Record<string, string> {
  /** The already-settled value of another key; a missing source is a generator bug, not a default. */
  const of = (key: string): string => {
    const v = settled[key];
    if (v === undefined) throw new Error(`vscode-theme-inherited: source key '${key}' is not set`);
    return v;
  };
  const s = p.semantic;
  const transparent = withAlpha(p.bg0, 0);
  const foreground = of("foreground");

  // Agent sessions window ---------------------------------------------------------------------
  const agentsPanelBorder = withAlpha(foreground, 0.15);
  const agentsPanelBackground = of("sideBar.background");
  const agentsPanelForeground = of("sideBar.foreground");
  const agentsBackground = of("editor.background");
  const buttonBackground = of("button.background");

  // Modern UI shell -----------------------------------------------------------------------------
  const modernActivityBarBackground = of("activityBar.background");
  const surfaceBorder = of("surface.border");

  return {
    // ── Agent sessions window ───────────────────────────────────────────────
    "agents.background": agentsBackground,
    "agentsPanel.background": agentsPanelBackground,
    "agentsPanel.foreground": agentsPanelForeground,
    "agentsPanel.border": agentsPanelBorder,
    "agentsCard.border": agentsPanelBorder,
    "agentsBottomPanel.border": agentsPanelBorder,
    "agentsDetail.background": agentsBackground,
    "agentsGradient.tintColor": buttonBackground,
    "activeSessionView.background": agentsPanelBackground,
    "activeSessionView.foreground": agentsPanelForeground,
    "inactiveSessionView.background": agentsBackground,
    "inactiveSessionView.foreground": agentsPanelForeground,
    "agentsBadge.background": of("activityBarBadge.background"),
    "agentsBadge.foreground": of("activityBarBadge.foreground"),
    "agentsUnreadBadge.background": of("activityBarBadge.background"),
    "agentsUnreadBadge.foreground": of("activityBarBadge.foreground"),
    "agentsChatInput.background": of("input.background"),
    "agentsChatInput.foreground": of("input.foreground"),
    "agentsChatInput.border": of("input.border"),
    "agentsChatInput.focusBorder": of("focusBorder"),
    "agentsChatInput.placeholderForeground": of("input.placeholderForeground"),
    "agentsNewSessionButton.background": transparent,
    "agentsNewSessionButton.foreground": of("sideBar.foreground"),
    "agentsNewSessionButton.border": of("button.secondaryBorder"),
    "agentsNewSessionButton.hoverBackground": of("toolbar.hoverBackground"),
    "agentsUpdateButton.downloadedBackground": withAlpha(buttonBackground, 0.7),
    "agentsUpdateButton.downloadingBackground": withAlpha(buttonBackground, 0.4),
    "agentFeedbackEditorWidget.background": p.bg2,
    "agentFeedbackEditorWidget.border": withAlpha(foreground, 0.35),
    "agentFeedbackInputWidget.border": of("editorWidget.border"),
    "agentsMobileDiff.addedForeground": of("gitDecoration.addedResourceForeground"),
    "agentsMobileDiff.deletedForeground": of("gitDecoration.deletedResourceForeground"),
    "agentsMobileDiff.modifiedForeground": of("gitDecoration.modifiedResourceForeground"),
    "editorOverviewRuler.agentFeedbackForeground": of("editorOverviewRuler.infoForeground"),

    // ── Chat ────────────────────────────────────────────────────────────────
    // VS Code derives the current chat match from the other matches at double alpha. Caligo's
    // editor highlight is already half opaque, so doubling would make the current match solid and
    // unfittable; 1.3x keeps it stronger than the other matches while the overlay fitter can still darken it
    // until chat text clears its floor.
    "chat.findMatchBackground": scaleAlpha(of("editor.findMatchHighlightBackground"), 1.3),
    "chat.findMatchHighlightBackground": of("editor.findMatchHighlightBackground"),
    "chat.statusBackground": withAlpha(foreground, 0.08),
    "chat.inputWorkingBorderColor1": buttonBackground,
    "chat.mcpCompatibilityWarningForeground": s.warning,
    "chat.sessionStateIndicator.inProgressBorder": s.warning,
    "chat.sessionStateIndicator.needsInputBorder": s.error,
    "chat.sessionStateIndicator.unvisitedBorder": s.success,
    "chat.workingProgressStableIconForeground": p.accent,
    "chat.workingProgressInsidersIconForeground": p.accentSoft,
    // Voice Mode: one base glow, with listening and speaking told apart by tint of the same hue.
    "chat.voiceGlowBaseColor": of("focusBorder"),
    "chat.voiceListeningGlow": p.accentSoft,
    "chat.voiceSpeakingGlow": p.accentMuted,
    "chat.dictationActiveMicGlow": p.accentSoft,

    // ── Modern UI shell ─────────────────────────────────────────────────────
    "modernUI.shellBackground": of("titleBar.activeBackground"),
    "modernUI.inactiveShellBackground": of("titleBar.inactiveBackground"),
    "modernActivityBar.background": modernActivityBarBackground,
    "modernActivityBar.inactiveBackground": modernActivityBarBackground,
    "modernActivityBar.border": surfaceBorder,
    // `modernActivityBarItem.*` replaced `modernActivityBar.{active,hover}*` in VS Code 1.136.
    "modernActivityBarItem.activeBackground": of("modernActivityBar.activeBackground"),
    "modernActivityBarItem.activeForeground": of("modernActivityBar.activeForeground"),
    "modernActivityBarItem.hoverBackground": of("modernActivityBar.hoverBackground"),
    "modernActivityBarItem.hoverForeground": of("modernActivityBar.hoverForeground"),
    "modernPanel.border": surfaceBorder,
    "modernSash.gripForeground": withAlpha(foreground, 0.4),

    // ── Classic workbench ───────────────────────────────────────────────────
    "statusBar.inactiveBackground": of("statusBar.background"),
    "tab.divider": of("tab.border"),
    "editorGroupHeader.connectedTabsBackground": of("editorGroupHeader.tabsBackground"),
    "editorWordWrapIndicator.foreground": of("editorWhitespace.foreground"),
  };
}
