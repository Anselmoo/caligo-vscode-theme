/**
 * Registry of every text-on-background pair the Caligo themes emit, and the evaluator that scores
 * a built theme against it with the single implementation in contrast.ts (alpha-composited).
 *
 * Source of the table: the pair survey in .werkplan/runs/20261020-2045-contrast-truth/map.pairs.json
 * (which VS Code foreground key is painted over which stack of background keys). The stack order
 * (which translucent layer sits over which) is a reading of VS Code rendering, not extracted from
 * VS Code source; correct a stack here and the gate follows.
 *
 * A "stack" is `base...>bg` in `colors` keys, bottom -> top. The bottom layer must be opaque in
 * every shipped theme; translucent layers above it are composited onto it (see contrast.ts).
 */
import { apcaLc, wcagContrastRatio } from "./contrast.js";

/** `text` = WCAG 1.4.3 (>= 4.5:1); `ui` = WCAG 1.4.11 glyphs and icons (>= 3:1). */
export type ContrastKind = "text" | "ui";

export interface ContrastPair {
  /** VS Code `colors` key of the foreground (may be translucent). */
  fg: string;
  /** `colors` key of the surface the foreground sits on (may be translucent). */
  bg: string;
  /** `colors` key(s) under `bg`, bottom -> top; the bottom one is opaque in every theme. */
  base?: string | readonly string[];
  /** Minimum WCAG 2.x ratio, compared on the raw float. */
  min: number;
  kind: ContrastKind;
  note?: string;
}

/** WCAG 1.4.3 (text) and 1.4.11 (non-text UI) floors. */
export const WCAG_MIN = { text: 4.5, ui: 3 } as const;

const NON_STANDARD_KEY_NOTE =
  "Non-standard key: unverified that VS Code consumes it; scored because the theme emits it.";

const PAIR_GROUPS: ReadonlyArray<
  readonly [fg: string, kind: ContrastKind, stacks: readonly string[]]
> = [
  [
    "editor.foreground",
    "text",
    [
      "editor.background",
      "editor.background>editor.lineHighlightBackground",
      "editor.background>editor.selectionBackground",
      "editor.background>editor.inactiveSelectionBackground",
      "editor.background>editor.selectionHighlightBackground",
      "editor.background>editor.wordHighlightBackground",
      "editor.background>editor.wordHighlightStrongBackground",
      "editor.background>editor.findMatchHighlightBackground",
      "editor.background>editor.findMatchBackground",
      "editor.background>editor.rangeHighlightBackground",
      "editor.background>editor.symbolHighlightBackground",
      "editor.background>editor.hoverHighlightBackground",
      "editor.background>editor.foldBackground",
      "editor.background>editor.linkedEditingBackground",
      "editor.background>editor.stackFrameHighlightBackground",
      "editor.background>editor.focusedStackFrameHighlightBackground",
      "editor.background>editorBracketMatch.background",
      "editor.background>diffEditor.insertedLineBackground>diffEditor.insertedTextBackground",
      "editor.background>diffEditor.removedLineBackground>diffEditor.removedTextBackground",
      "editor.background>merge.currentContentBackground",
      "editor.background>merge.incomingContentBackground",
      "editor.background>merge.commonContentBackground",
      "editor.background>editorError.background",
      "editor.background>editorWarning.background",
      "editor.background>editorInfo.background",
      "editor.background>editor.lineHighlightBackground>editor.selectionBackground",
      "editor.background>peekViewEditor.background",
      "editor.background>peekViewEditor.background>peekViewEditor.matchHighlightBackground",
      "notebook.editorBackground",
      "notebook.editorBackground>notebook.focusedCellBackground",
      "notebook.editorBackground>notebook.selectedCellBackground",
      "notebook.cellEditorBackground",
      "notebook.editorBackground>notebook.cellHoverBackground",
      "editorStickyScroll.background",
      "editorStickyScroll.background>editorStickyScrollHover.background",
      "editor.background>searchEditor.findMatchBackground",
    ],
  ],
  ["editor.selectionForeground", "text", ["editor.background>editor.selectionBackground"]],
  ["editor.findMatchForeground", "text", ["editor.background>editor.findMatchBackground"]],
  [
    "editor.findMatchHighlightForeground",
    "text",
    ["editor.background>editor.findMatchHighlightBackground"],
  ],
  ["editor.foldPlaceholderForeground", "text", ["editor.background>editor.foldBackground"]],
  ["editorLineNumber.foreground", "text", ["editor.background", "editorGutter.background"]],
  [
    "editorLineNumber.activeForeground",
    "text",
    ["editor.background", "editor.background>editor.lineHighlightBackground"],
  ],
  [
    "editorActiveLineNumber.foreground",
    "text",
    ["editor.background", "editor.background>editor.lineHighlightBackground"],
  ],
  ["editorCursor.background", "text", ["editorCursor.foreground"]],
  ["editorMultiCursor.primary.background", "text", ["editorMultiCursor.primary.foreground"]],
  ["terminalCursor.background", "text", ["terminalCursor.foreground"]],
  ["editorCursor.foreground", "ui", ["editor.background"]],
  [
    "editorGhostText.foreground",
    "text",
    ["editor.background", "editor.background>editorGhostText.background"],
  ],
  ["editor.placeholder.foreground", "text", ["editor.background"]],
  ["editorCodeLens.foreground", "text", ["editor.background"]],
  ["editor.inlineValuesForeground", "text", ["editor.background>editor.inlineValuesBackground"]],
  ["editorInlayHint.foreground", "text", ["editor.background>editorInlayHint.background"]],
  ["editorInlayHint.typeForeground", "text", ["editor.background>editorInlayHint.typeBackground"]],
  [
    "editorInlayHint.parameterForeground",
    "text",
    ["editor.background>editorInlayHint.parameterBackground"],
  ],
  ["editorLink.activeForeground", "text", ["editor.background"]],
  ["editorBracketMatch.foreground", "text", ["editor.background>editorBracketMatch.background"]],
  ["editorBracketHighlight.foreground1", "text", ["editor.background"]],
  ["editorBracketHighlight.foreground2", "text", ["editor.background"]],
  ["editorBracketHighlight.foreground3", "text", ["editor.background"]],
  ["editorBracketHighlight.foreground4", "text", ["editor.background"]],
  ["editorBracketHighlight.foreground5", "text", ["editor.background"]],
  ["editorBracketHighlight.foreground6", "text", ["editor.background"]],
  ["editorBracketHighlight.unexpectedBracket.foreground", "text", ["editor.background"]],
  [
    "editorError.foreground",
    "text",
    ["editor.background", "editor.background>editorError.background"],
  ],
  [
    "editorWarning.foreground",
    "text",
    ["editor.background", "editor.background>editorWarning.background"],
  ],
  [
    "editorInfo.foreground",
    "text",
    ["editor.background", "editor.background>editorInfo.background"],
  ],
  ["editorHint.foreground", "text", ["editor.background"]],
  ["editorLightBulb.foreground", "ui", ["editor.background"]],
  ["editorLightBulbAutoFix.foreground", "ui", ["editor.background"]],
  ["editorLightBulbAi.foreground", "ui", ["editor.background"]],
  ["editorGutter.foldingControlForeground", "ui", ["editorGutter.background"]],
  [
    "editorGutter.itemGlyphForeground",
    "ui",
    ["editorGutter.background", "editorGutter.background>editorGutter.itemBackground"],
  ],
  ["editorGutter.commentGlyphForeground", "ui", ["editorGutter.background"]],
  ["editorWidget.foreground", "text", ["editorWidget.background"]],
  [
    "editorHoverWidget.foreground",
    "text",
    ["editorHoverWidget.background", "editorHoverWidget.statusBarBackground"],
  ],
  ["editorHoverWidget.highlightForeground", "text", ["editorHoverWidget.background"]],
  ["editorSuggestWidget.foreground", "text", ["editorSuggestWidget.background"]],
  [
    "editorSuggestWidget.selectedForeground",
    "text",
    ["editorSuggestWidget.background>editorSuggestWidget.selectedBackground"],
  ],
  ["editorSuggestWidget.highlightForeground", "text", ["editorSuggestWidget.background"]],
  [
    "editorSuggestWidget.focusHighlightForeground",
    "text",
    ["editorSuggestWidget.background>editorSuggestWidget.selectedBackground"],
  ],
  [
    "editorSuggestWidget.selectedIconForeground",
    "ui",
    ["editorSuggestWidget.background>editorSuggestWidget.selectedBackground"],
  ],
  ["editorSuggestWidgetStatus.foreground", "text", ["editorSuggestWidget.background"]],
  ["editorActionList.foreground", "text", ["editorActionList.background"]],
  [
    "editorActionList.focusForeground",
    "text",
    ["editorActionList.background>editorActionList.focusBackground"],
  ],
  ["editorGroup.dropIntoPromptForeground", "text", ["editorGroup.dropIntoPromptBackground"]],
  ["tab.activeForeground", "text", ["tab.activeBackground"]],
  ["tab.inactiveForeground", "text", ["tab.inactiveBackground"]],
  [
    "tab.hoverForeground",
    "text",
    ["editorGroupHeader.tabsBackground>tab.hoverBackground", "tab.hoverBackground"],
  ],
  [
    "tab.selectedForeground",
    "text",
    [
      "editorGroupHeader.tabsBackground>tab.selectedBackground",
      "tab.activeBackground>tab.selectedBackground",
    ],
  ],
  ["tab.unfocusedActiveForeground", "text", ["tab.unfocusedActiveBackground"]],
  ["tab.unfocusedInactiveForeground", "text", ["tab.unfocusedInactiveBackground"]],
  [
    "tab.unfocusedHoverForeground",
    "text",
    ["editorGroupHeader.tabsBackground>tab.unfocusedHoverBackground"],
  ],
  [
    "modernTab.activeForeground",
    "text",
    ["editorGroupHeader.tabsBackground>modernTab.activeBackground"],
  ],
  [
    "modernTab.hoverForeground",
    "text",
    ["editorGroupHeader.tabsBackground>modernTab.hoverBackground"],
  ],
  [
    "modernEditorTab.activeForeground",
    "text",
    ["editorGroupHeader.tabsBackground>modernEditorTab.activeBackground"],
  ],
  [
    "modernEditorTab.hoverForeground",
    "text",
    ["editorGroupHeader.tabsBackground>modernEditorTab.hoverBackground"],
  ],
  [
    "modernActivityBar.activeForeground",
    "ui",
    ["activityBar.background>modernActivityBar.activeBackground"],
  ],
  [
    "modernActivityBar.hoverForeground",
    "ui",
    ["activityBar.background>modernActivityBar.hoverBackground"],
  ],
  [
    "modernActivityBarItem.activeForeground",
    "ui",
    ["activityBar.background>modernActivityBarItem.activeBackground"],
  ],
  [
    "modernActivityBarItem.hoverForeground",
    "ui",
    ["activityBar.background>modernActivityBarItem.hoverBackground"],
  ],
  ["activeSessionView.foreground", "text", ["activeSessionView.background"]],
  ["inactiveSessionView.foreground", "text", ["inactiveSessionView.background"]],
  ["agentsPanel.foreground", "text", ["agentsPanel.background"]],
  ["agentsBadge.foreground", "text", ["agentsBadge.background"]],
  ["agentsUnreadBadge.foreground", "text", ["agentsUnreadBadge.background"]],
  ["agentsChatInput.foreground", "text", ["agentsChatInput.background"]],
  ["agentsChatInput.placeholderForeground", "text", ["agentsChatInput.background"]],
  [
    "agentsNewSessionButton.foreground",
    "text",
    [
      "sideBar.background>agentsNewSessionButton.background",
      "sideBar.background>agentsNewSessionButton.hoverBackground",
    ],
  ],
  ["agentsMobileDiff.addedForeground", "text", ["agentsPanel.background", "editor.background"]],
  ["agentsMobileDiff.deletedForeground", "text", ["agentsPanel.background", "editor.background"]],
  ["agentsMobileDiff.modifiedForeground", "text", ["agentsPanel.background", "editor.background"]],
  [
    "chat.mcpCompatibilityWarningForeground",
    "text",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "chat.workingProgressStableIconForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "chat.workingProgressInsidersIconForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "foreground",
    "text",
    [
      "sideBar.background",
      "panel.background",
      "editor.background",
      "editorWidget.background",
      "quickInput.background",
      "menu.background",
      "activityBar.background",
      "statusBar.background",
      "titleBar.activeBackground",
      "sideBar.background>chat.statusBackground",
      "sideBar.background>chat.findMatchHighlightBackground",
      "sideBar.background>chat.findMatchBackground",
    ],
  ],
  [
    "descriptionForeground",
    "text",
    [
      "sideBar.background",
      "panel.background",
      "editor.background",
      "sideBar.background>list.activeSelectionBackground",
    ],
  ],
  ["errorForeground", "text", ["sideBar.background", "editor.background", "panel.background"]],
  ["icon.foreground", "ui", ["sideBar.background", "panel.background", "editor.background"]],
  ["sideBar.foreground", "text", ["sideBar.background"]],
  ["sideBarTitle.foreground", "text", ["sideBarTitle.background"]],
  ["sideBarSectionHeader.foreground", "text", ["sideBarSectionHeader.background"]],
  ["panelSectionHeader.foreground", "text", ["panelSectionHeader.background"]],
  ["panelTitle.activeForeground", "text", ["panel.background"]],
  ["panelTitle.inactiveForeground", "text", ["panel.background"]],
  [
    "activityBar.foreground",
    "ui",
    ["activityBar.background", "activityBar.background>activityBar.activeBackground"],
  ],
  ["activityBar.inactiveForeground", "ui", ["activityBar.background"]],
  ["activityBarTop.foreground", "ui", ["activityBarTop.background"]],
  ["activityBarTop.inactiveForeground", "ui", ["activityBarTop.background"]],
  ["activityBarBadge.foreground", "text", ["activityBarBadge.background"]],
  ["panelTitleBadge.foreground", "text", ["panelTitleBadge.background"]],
  [
    "activityErrorBadge.foreground",
    "text",
    ["activityBar.background>activityErrorBadge.background"],
  ],
  [
    "activityWarningBadge.foreground",
    "text",
    ["activityBar.background>activityWarningBadge.background"],
  ],
  ["profileBadge.foreground", "text", ["activityBar.background>profileBadge.background"]],
  ["extensionBadge.remoteForeground", "text", ["extensionBadge.remoteBackground"]],
  ["testing.coverCountBadgeForeground", "text", ["testing.coverCountBadgeBackground"]],
  [
    "badge.foreground",
    "text",
    [
      "sideBar.background>badge.background",
      "panel.background>badge.background",
      "editorGroupHeader.tabsBackground>badge.background",
    ],
  ],
  [
    "statusBar.foreground",
    "text",
    [
      "statusBar.background",
      "statusBar.background>statusBarItem.activeBackground",
      "statusBar.background>statusBarItem.compactHoverBackground",
    ],
  ],
  ["statusBarItem.hoverForeground", "text", ["statusBar.background>statusBarItem.hoverBackground"]],
  [
    "statusBarItem.prominentForeground",
    "text",
    ["statusBar.background>statusBarItem.prominentBackground"],
  ],
  [
    "statusBarItem.prominentHoverForeground",
    "text",
    ["statusBar.background>statusBarItem.prominentHoverBackground"],
  ],
  ["statusBarItem.remoteForeground", "text", ["statusBarItem.remoteBackground"]],
  ["statusBarItem.remoteHoverForeground", "text", ["statusBarItem.remoteHoverBackground"]],
  ["statusBarItem.offlineForeground", "text", ["statusBarItem.offlineBackground"]],
  ["statusBarItem.offlineHoverForeground", "text", ["statusBarItem.offlineHoverBackground"]],
  ["statusBarItem.errorForeground", "text", ["statusBar.background>statusBarItem.errorBackground"]],
  [
    "statusBarItem.errorHoverForeground",
    "text",
    ["statusBar.background>statusBarItem.errorHoverBackground"],
  ],
  [
    "statusBarItem.warningForeground",
    "text",
    ["statusBar.background>statusBarItem.warningBackground"],
  ],
  [
    "statusBarItem.warningHoverForeground",
    "text",
    ["statusBar.background>statusBarItem.warningHoverBackground"],
  ],
  ["statusBar.debuggingForeground", "text", ["statusBar.debuggingBackground"]],
  ["statusBar.noFolderForeground", "text", ["statusBar.noFolderBackground"]],
  ["titleBar.activeForeground", "text", ["titleBar.activeBackground"]],
  ["titleBar.inactiveForeground", "text", ["titleBar.inactiveBackground"]],
  ["commandCenter.foreground", "text", ["commandCenter.background"]],
  [
    "commandCenter.activeForeground",
    "text",
    ["commandCenter.background>commandCenter.activeBackground"],
  ],
  ["commandCenter.inactiveForeground", "text", ["commandCenter.background"]],
  ["menu.foreground", "text", ["menu.background"]],
  ["menu.selectionForeground", "text", ["menu.background>menu.selectionBackground"]],
  [
    "menubar.selectionForeground",
    "text",
    ["titleBar.activeBackground>menubar.selectionBackground"],
  ],
  [
    "keybindingLabel.foreground",
    "text",
    [
      "editor.background>keybindingLabel.background",
      "quickInput.background>keybindingLabel.background",
      "sideBar.background>keybindingLabel.background",
    ],
  ],
  ["banner.foreground", "text", ["banner.background"]],
  ["banner.iconForeground", "ui", ["banner.background"]],
  ["breadcrumb.foreground", "text", ["breadcrumb.background"]],
  ["breadcrumb.focusForeground", "text", ["breadcrumb.background"]],
  ["breadcrumb.activeSelectionForeground", "text", ["breadcrumb.background"]],
  ["input.foreground", "text", ["input.background"]],
  ["input.placeholderForeground", "text", ["input.background"]],
  ["inputOption.activeForeground", "text", ["input.background>inputOption.activeBackground"]],
  [
    "inputValidation.errorForeground",
    "text",
    [
      "sideBar.background>inputValidation.errorBackground",
      "editor.background>inputValidation.errorBackground",
    ],
  ],
  [
    "inputValidation.warningForeground",
    "text",
    [
      "sideBar.background>inputValidation.warningBackground",
      "editor.background>inputValidation.warningBackground",
    ],
  ],
  [
    "inputValidation.infoForeground",
    "text",
    [
      "sideBar.background>inputValidation.infoBackground",
      "editor.background>inputValidation.infoBackground",
    ],
  ],
  ["button.foreground", "text", ["button.background", "button.hoverBackground"]],
  [
    "button.secondaryForeground",
    "text",
    ["button.secondaryBackground", "button.secondaryBackground>button.secondaryHoverBackground"],
  ],
  [
    "extensionButton.foreground",
    "text",
    ["extensionButton.background", "extensionButton.hoverBackground"],
  ],
  [
    "extensionButton.prominentForeground",
    "text",
    ["extensionButton.prominentBackground", "extensionButton.prominentHoverBackground"],
  ],
  ["checkbox.foreground", "text", ["checkbox.background"]],
  ["radio.activeForeground", "text", ["sideBar.background>radio.activeBackground"]],
  [
    "radio.inactiveForeground",
    "text",
    [
      "sideBar.background>radio.inactiveBackground",
      "sideBar.background>radio.inactiveHoverBackground",
    ],
  ],
  ["dropdown.foreground", "text", ["dropdown.background", "dropdown.listBackground"]],
  ["settings.dropdownForeground", "text", ["settings.dropdownBackground"]],
  ["settings.checkboxForeground", "text", ["settings.checkboxBackground"]],
  ["settings.textInputForeground", "text", ["settings.textInputBackground"]],
  ["settings.numberInputForeground", "text", ["settings.numberInputBackground"]],
  [
    "settings.headerForeground",
    "text",
    [
      "editor.background",
      "editor.background>settings.focusedRowBackground",
      "editor.background>settings.rowHoverBackground",
    ],
  ],
  ["settings.settingsHeaderHoverForeground", "text", ["editor.background"]],
  [
    "list.activeSelectionForeground",
    "text",
    [
      "sideBar.background>list.activeSelectionBackground",
      "panel.background>list.activeSelectionBackground",
    ],
  ],
  [
    "list.inactiveSelectionForeground",
    "text",
    [
      "sideBar.background>list.inactiveSelectionBackground",
      "panel.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "list.focusForeground",
    "text",
    ["sideBar.background>list.focusBackground", "panel.background>list.focusBackground"],
  ],
  [
    "list.hoverForeground",
    "text",
    ["sideBar.background>list.hoverBackground", "panel.background>list.hoverBackground"],
  ],
  [
    "list.highlightForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
      "sideBar.background>list.filterMatchBackground",
      "panel.background",
      "panel.background>list.activeSelectionBackground",
      "panel.background>list.hoverBackground",
      "panel.background>list.inactiveSelectionBackground",
      "panel.background>list.filterMatchBackground",
    ],
  ],
  [
    "list.focusHighlightForeground",
    "text",
    [
      "sideBar.background>list.focusBackground",
      "sideBar.background>list.activeSelectionBackground",
      "panel.background>list.focusBackground",
      "panel.background>list.activeSelectionBackground",
    ],
  ],
  [
    "list.deemphasizedForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "panel.background",
      "panel.background>list.activeSelectionBackground",
      "panel.background>list.hoverBackground",
    ],
  ],
  [
    "list.errorForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "panel.background",
      "panel.background>list.activeSelectionBackground",
      "panel.background>list.hoverBackground",
    ],
  ],
  [
    "list.warningForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "panel.background",
      "panel.background>list.activeSelectionBackground",
      "panel.background>list.hoverBackground",
    ],
  ],
  [
    "list.invalidItemForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "panel.background",
      "panel.background>list.activeSelectionBackground",
    ],
  ],
  [
    "list.activeSelectionIconForeground",
    "ui",
    [
      "sideBar.background>list.activeSelectionBackground",
      "panel.background>list.activeSelectionBackground",
    ],
  ],
  [
    "list.inactiveSelectionIconForeground",
    "ui",
    [
      "sideBar.background>list.inactiveSelectionBackground",
      "panel.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.untrackedResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.ignoredResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.conflictingResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.renamedResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.submoduleResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.stageDeletedResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.deletedResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.modifiedResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.addedResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "gitDecoration.stageModifiedResourceForeground",
    "text",
    [
      "sideBar.background",
      "sideBar.background>list.activeSelectionBackground",
      "sideBar.background>list.hoverBackground",
      "sideBar.background>list.inactiveSelectionBackground",
    ],
  ],
  [
    "quickInput.foreground",
    "text",
    ["quickInput.background", "quickInput.background>quickInputTitle.background"],
  ],
  [
    "quickInputList.focusForeground",
    "text",
    ["quickInput.background>quickInputList.focusBackground"],
  ],
  [
    "quickInputList.focusHighlightForeground",
    "text",
    ["quickInput.background>quickInputList.focusBackground"],
  ],
  [
    "quickInputList.focusIconForeground",
    "ui",
    ["quickInput.background>quickInputList.focusBackground"],
  ],
  ["pickerGroup.foreground", "text", ["quickInput.background"]],
  ["listFilterWidget.noMatchesOutline", "ui", ["listFilterWidget.background"]],
  ["notifications.foreground", "text", ["notifications.background"]],
  ["notificationCenterHeader.foreground", "text", ["notificationCenterHeader.background"]],
  ["notificationLink.foreground", "text", ["notifications.background"]],
  ["peekViewResult.fileForeground", "text", ["peekViewResult.background"]],
  [
    "peekViewResult.lineForeground",
    "text",
    [
      "peekViewResult.background",
      "peekViewResult.background>peekViewResult.matchHighlightBackground",
    ],
  ],
  [
    "peekViewResult.selectionForeground",
    "text",
    ["peekViewResult.background>peekViewResult.selectionBackground"],
  ],
  ["peekViewTitleLabel.foreground", "text", ["peekViewTitle.background"]],
  ["peekViewTitleDescription.foreground", "text", ["peekViewTitle.background"]],
  ["diffEditor.unchangedRegionForeground", "text", ["diffEditor.unchangedRegionBackground"]],
  [
    "textLink.foreground",
    "text",
    [
      "editor.background",
      "sideBar.background",
      "welcomePage.background",
      "editor.background>textCodeBlock.background",
    ],
  ],
  [
    "textLink.activeForeground",
    "text",
    ["editor.background", "sideBar.background", "welcomePage.background"],
  ],
  [
    "textPreformat.foreground",
    "text",
    ["editor.background>textPreformat.background", "sideBar.background>textPreformat.background"],
  ],
  ["walkthrough.stepTitle.foreground", "text", ["welcomePage.background"]],
  ["search.resultsInfoForeground", "text", ["editor.background", "sideBar.background"]],
  ["charts.foreground", "text", ["editor.background", "sideBar.background"]],
  ["symbolIcon.textForeground", "ui", ["sideBar.background", "editorWidget.background"]],
  ["debugConsole.infoForeground", "text", ["panel.background"]],
  ["debugConsole.warningForeground", "text", ["panel.background"]],
  ["debugConsole.errorForeground", "text", ["panel.background"]],
  ["debugConsole.sourceForeground", "text", ["panel.background"]],
  ["debugView.stateLabelForeground", "text", ["sideBar.background>debugView.stateLabelBackground"]],
  [
    "debugView.exceptionLabelForeground",
    "text",
    ["sideBar.background>debugView.exceptionLabelBackground"],
  ],
  [
    "chat.slashCommandForeground",
    "text",
    [
      "editor.background>chat.slashCommandBackground",
      "sideBar.background>chat.slashCommandBackground",
    ],
  ],
  ["chat.avatarForeground", "text", ["chat.avatarBackground"]],
  ["chat.editedFileForeground", "text", ["sideBar.background", "editor.background"]],
  ["inlineChat.foreground", "text", ["inlineChat.background"]],
  ["inlineChatInput.placeholderForeground", "text", ["inlineChatInput.background"]],
  [
    "scmGraph.historyItemHoverDefaultLabelForeground",
    "text",
    ["editorHoverWidget.background>scmGraph.historyItemHoverDefaultLabelBackground"],
  ],
  ["agentSessionReadIndicator.foreground", "ui", ["sideBar.background"]],
  ["agentsVoice.speakingForeground", "ui", ["sideBar.background>agentsVoice.speakingBackground"]],
  [
    "inlineEdit.gutterIndicator.primaryForeground",
    "ui",
    ["inlineEdit.gutterIndicator.primaryBackground"],
  ],
  [
    "inlineEdit.gutterIndicator.successfulForeground",
    "ui",
    ["editor.background>inlineEdit.gutterIndicator.successfulBackground"],
  ],
  ["gauge.foreground", "ui", ["sideBar.background>gauge.background"]],
  ["gauge.errorForeground", "ui", ["sideBar.background>gauge.errorBackground"]],
  ["gauge.warningForeground", "ui", ["sideBar.background>gauge.warningBackground"]],
  ["notebookStatusSuccessIcon.foreground", "ui", ["notebook.editorBackground"]],
  ["notebookStatusErrorIcon.foreground", "ui", ["notebook.editorBackground"]],
  ["notebookStatusRunningIcon.foreground", "ui", ["notebook.editorBackground"]],
  [
    "terminal.foreground",
    "text",
    [
      "terminal.background",
      "terminal.background>terminal.selectionBackground",
      "terminal.background>terminal.inactiveSelectionBackground",
      "terminal.background>terminal.findMatchBackground",
      "terminal.background>terminal.findMatchHighlightBackground",
      "terminal.background>terminal.hoverHighlightBackground",
    ],
  ],
  ["terminal.selectionForeground", "text", ["terminal.background>terminal.selectionBackground"]],
  ["terminal.initialHintForeground", "text", ["terminal.background"]],
  [
    "terminalSymbolIcon.inlineSuggestionForeground",
    "text",
    ["quickInput.background", "editorWidget.background"],
  ],
  [
    "terminal.ansiRed",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiGreen",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiYellow",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiBlue",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiMagenta",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiCyan",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiWhite",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiBrightBlack",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiBrightRed",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiBrightGreen",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiBrightYellow",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiBrightBlue",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiBrightMagenta",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiBrightCyan",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  [
    "terminal.ansiBrightWhite",
    "text",
    ["terminal.background", "terminal.background>terminal.selectionBackground"],
  ],
  ["scmGraph.foreground1", "ui", ["sideBar.background"]],
  ["scmGraph.foreground2", "ui", ["sideBar.background"]],
  ["scmGraph.foreground3", "ui", ["sideBar.background"]],
  ["scmGraph.foreground4", "ui", ["sideBar.background"]],
  ["scmGraph.foreground5", "ui", ["sideBar.background"]],
  ["editorMultiCursor.primary.foreground", "ui", ["editor.background"]],
  ["editorMultiCursor.secondary.foreground", "ui", ["editor.background"]],
  ["editorGutter.commentDraftGlyphForeground", "ui", ["editorGutter.background"]],
  ["editorGutter.commentUnresolvedGlyphForeground", "ui", ["editorGutter.background"]],
  [
    "git.blame.editorDecorationForeground",
    "text",
    ["editor.background", "editor.background>editor.lineHighlightBackground"],
  ],
  [
    "scmGraph.historyItemHoverAdditionsForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "scmGraph.historyItemHoverDeletionsForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "extensionIcon.starForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "extensionIcon.verifiedForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "extensionIcon.preReleaseForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "extensionIcon.sponsorForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "extensionIcon.privateForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  ["mcpIcon.starForeground", "ui", ["sideBar.background", "panel.background", "editor.background"]],
  [
    "ports.iconRunningProcessForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.breakpointForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.breakpointDisabledForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.breakpointUnverifiedForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.breakpointCurrentStackframeForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.breakpointStackframeForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.startForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.pauseForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.stopForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.disconnectForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.restartForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.stepOverForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.stepIntoForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.stepOutForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.stepBackForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugIcon.continueForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "debugConsoleInputIcon.foreground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "chat.linesAddedForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "chat.linesRemovedForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "inlineEdit.gutterIndicator.secondaryForeground",
    "ui",
    ["editor.background>inlineEdit.gutterIndicator.secondaryBackground"],
  ],
  ["terminalCursor.foreground", "ui", ["terminal.background"]],
  [
    "terminalSymbolIcon.fileForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.folderForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.methodForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.aliasForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.argumentForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.optionForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.optionValueForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.flagForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.branchForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.commitForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.tagForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.stashForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.remoteForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.pullRequestForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.pullRequestDoneForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.symbolicLinkFileForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  [
    "terminalSymbolIcon.symbolicLinkFolderForeground",
    "ui",
    ["quickInput.background", "editorWidget.background", "editorSuggestWidget.background"],
  ],
  ["surface.foreground", "text", ["sideBar.background", "editor.background", "surface.background"]],
  ["strongForeground", "text", ["sideBar.background", "editor.background", "surface.background"]],
  [
    "welcomePage.progress.foreground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "symbolIcon.arrayForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.booleanForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.classForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.colorForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.constantForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.constructorForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.enumeratorForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.enumeratorMemberForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.eventForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.fieldForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.fileForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.folderForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.functionForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.interfaceForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.keyForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.keywordForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.methodForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.moduleForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.namespaceForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.nullForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.numberForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.objectForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.operatorForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.packageForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.propertyForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.referenceForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.snippetForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.stringForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.structForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.typeParameterForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.unitForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "symbolIcon.variableForeground",
    "ui",
    ["sideBar.background", "editorSuggestWidget.background", "breadcrumbPicker.background"],
  ],
  [
    "problemsErrorIcon.foreground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "notificationsErrorIcon.foreground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "testing.message.error.badgeForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "problemsWarningIcon.foreground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "notificationsWarningIcon.foreground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  ["markdownAlert.warning.foreground", "text", ["editor.background", "welcomePage.background"]],
  ["markdownAlert.caution.foreground", "text", ["editor.background", "welcomePage.background"]],
  ["markdownAlert.tip.foreground", "text", ["editor.background", "welcomePage.background"]],
  [
    "problemsInfoIcon.foreground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "notificationsInfoIcon.foreground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  [
    "testing.message.info.decorationForeground",
    "ui",
    ["sideBar.background", "panel.background", "editor.background"],
  ],
  ["markdownAlert.note.foreground", "text", ["editor.background", "welcomePage.background"]],
  ["markdownAlert.important.foreground", "text", ["editor.background", "welcomePage.background"]],
];

export const CONTRAST_EXEMPT_FOREGROUNDS: Readonly<Record<string, string>> = {
  "editorOverviewRuler.agentFeedbackForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorWordWrapIndicator.foreground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "modernSash.gripForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "checkbox.disabled.foreground":
    "Disabled or dimmed state: inactive components are exempt from WCAG 1.4.3 / 1.4.11; reported, not gated.",
  "diffEditorOverview.insertedForeground":
    "Disabled or dimmed state: inactive components are exempt from WCAG 1.4.3 / 1.4.11; reported, not gated.",
  "diffEditorOverview.removedForeground":
    "Disabled or dimmed state: inactive components are exempt from WCAG 1.4.3 / 1.4.11; reported, not gated.",
  disabledForeground:
    "Disabled or dimmed state: inactive components are exempt from WCAG 1.4.3 / 1.4.11; reported, not gated.",
  "editorGutter.commentRangeForeground":
    "Disabled or dimmed state: inactive components are exempt from WCAG 1.4.3 / 1.4.11; reported, not gated.",
  "editorLineNumber.dimmedForeground":
    "Disabled or dimmed state: inactive components are exempt from WCAG 1.4.3 / 1.4.11; reported, not gated.",
  "editorOverviewRuler.addedForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.bracketMatchForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.commentDraftForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.commentForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.commentUnresolvedForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.commonContentForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.currentContentForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.deletedForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.errorForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.findMatchForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.incomingContentForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.infoForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.modifiedForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.rangeHighlightForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.selectionHighlightForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.warningForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.wordHighlightForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.wordHighlightStrongForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorOverviewRuler.wordHighlightTextForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "editorRuler.foreground":
    "Disabled or dimmed state: inactive components are exempt from WCAG 1.4.3 / 1.4.11; reported, not gated.",
  "editorWhitespace.foreground":
    "Disabled or dimmed state: inactive components are exempt from WCAG 1.4.3 / 1.4.11; reported, not gated.",
  "notebookEditorOverviewRuler.runningCellForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "scmGraph.historyItemHoverLabelForeground":
    "Drawn over scmGraph.historyItemHoverDefaultLabelBackground, which is translucent with no opaque base declared by the theme; the underlying surface is unknown, so no honest stack can be scored. Unverified, not gated.",
  "terminal.ansiBlack":
    "Report-only: ANSI black is a palette entry whose contrast depends on the terminal background the user runs against (often itself black); not gated.",
  "terminalCommandGuide.foreground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "terminalOverviewRuler.cursorForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "terminalOverviewRuler.findMatchForeground":
    "Decorative guide, ruler or overview-ruler mark: carries no text and no information that is not available elsewhere (WCAG 1.4.11 does not apply); not gated.",
  "textSeparator.foreground":
    "Disabled or dimmed state: inactive components are exempt from WCAG 1.4.3 / 1.4.11; reported, not gated.",
};

function expandGroups(): ContrastPair[] {
  const pairs: ContrastPair[] = [];
  for (const [fg, kind, stacks] of PAIR_GROUPS) {
    for (const stack of stacks) {
      const layers = stack.split(">");
      const bg = layers[layers.length - 1];
      const base = layers.slice(0, -1);
      const pair: ContrastPair = { fg, bg, min: WCAG_MIN[kind], kind };
      if (base.length > 0) pair.base = base;
      if (/^modern(Tab|EditorTab|ActivityBar)\./.test(fg)) pair.note = NON_STANDARD_KEY_NOTE;
      pairs.push(pair);
    }
  }
  return pairs;
}

/** Every gated pair. Ids (see `pairId`) are unique. */
export const CONTRAST_PAIRS: readonly ContrastPair[] = expandGroups();

/**
 * Editor stacks that code is painted on, `base...>overlay` in `colors` keys, bottom -> top.
 *
 * The registry above scores `editor.foreground` on a few of them, but code is mostly painted in
 * token colors (tokenColors / semanticTokenColors): a constant or keyword on a removed line, a
 * comment inside a merge conflict. Every distinct code ink of a theme is gated over each stack
 * here (see `codeInks`), and the overlay fit treats those inks as readers of the top layer.
 */
export const CODE_STACKS: readonly string[] = [
  "editor.background>diffEditor.removedLineBackground",
  "editor.background>diffEditor.removedLineBackground>diffEditor.removedTextBackground",
  "editor.background>diffEditor.insertedLineBackground",
  "editor.background>diffEditor.insertedLineBackground>diffEditor.insertedTextBackground",
  "editor.background>merge.currentContentBackground",
  "editor.background>merge.incomingContentBackground",
  "editor.background>merge.commonContentBackground",
  "editor.background>mergeEditor.conflictingLines.background",
  "editor.background>mergeEditor.change.background",
  "editor.background>inlineChatDiff.removed",
  "editor.background>inlineChatDiff.inserted",
];

/**
 * Distinct code inks of a theme: every tokenColors and semanticTokenColors foreground, deduplicated
 * by hex (the first label that uses a hex names it). `editor.foreground` is not included; the
 * registry pairs above cover it.
 */
export function codeInks(theme: ThemeJson): Array<{ label: string; fg: string }> {
  const seen = new Map<string, string>();
  for (const rule of theme.tokenColors ?? []) {
    const fg = rule.settings?.foreground;
    if (fg && !seen.has(fg))
      seen.set(fg, `token:${rule.name ?? [rule.scope ?? ""].flat().join(",")}`);
  }
  for (const [selector, value] of Object.entries(theme.semanticTokenColors ?? {})) {
    const fg = typeof value === "string" ? value : value?.foreground;
    if (fg && !seen.has(fg)) seen.set(fg, `semantic:${selector}`);
  }
  return [...seen].map(([fg, label]) => ({ label, fg }));
}

const baseKeys = (base: ContrastPair["base"]): string[] =>
  base === undefined ? [] : ([] as string[]).concat(base);

/** `${fg}|${[...base, bg].join(">")}`, e.g. `editor.foreground|editor.background>editor.selectionBackground`. */
export function pairId(p: { fg: string; bg: string; base?: string | readonly string[] }): string {
  return `${p.fg}|${[...baseKeys(p.base), p.bg].join(">")}`;
}

export interface ThemeJson {
  colors?: Record<string, string>;
  tokenColors?: Array<{
    name?: string;
    scope?: string | string[];
    settings?: { foreground?: string };
  }>;
  semanticTokenColors?: Record<string, string | { foreground?: string }>;
}

export interface PairResult {
  id: string;
  kind: ContrastKind;
  min: number;
  /** Foreground hex exactly as emitted (may be #RRGGBBAA). */
  fg: string;
  /** Background hexes exactly as emitted, bottom -> top. */
  layers: string[];
  /** Composited WCAG 2.x ratio, unrounded. */
  wcag: number;
  /** Composited absolute APCA Lc. */
  apcaLc: number;
  /** `wcag >= min` on the raw float. */
  pass: boolean;
}

const EDITOR_BG = "editor.background";

function score(id: string, kind: ContrastKind, fg: string, layers: string[]): PairResult {
  // layers[0] is the opaque bottom; the last layer is the surface the foreground sits on.
  const bg = layers[layers.length - 1];
  const base = layers.slice(0, -1);
  const wcag = wcagContrastRatio(fg, bg, base);
  return {
    id,
    kind,
    min: WCAG_MIN[kind],
    fg,
    layers,
    wcag,
    apcaLc: apcaLc(fg, bg, base),
    pass: wcag >= WCAG_MIN[kind],
  };
}

function requireColor(colors: Record<string, string>, key: string, id: string): string {
  const v = colors[key];
  if (typeof v !== "string") {
    throw new Error(`evaluateThemeContrast: theme has no colors['${key}'] (needed by ${id})`);
  }
  return v;
}

/**
 * Score a built theme: every registry pair, plus one `text` pair per tokenColors rule and per
 * semanticTokenColors selector that has a foreground, each over `editor.background` (min 4.5).
 * Throws on a missing registry key, malformed hex, a translucent stack bottom or a duplicate id.
 */
export function evaluateThemeContrast(theme: ThemeJson): PairResult[] {
  const colors = theme.colors ?? {};
  const results: PairResult[] = [];
  const seen = new Set<string>();
  const push = (r: PairResult) => {
    if (seen.has(r.id)) throw new Error(`evaluateThemeContrast: duplicate pair id '${r.id}'`);
    seen.add(r.id);
    results.push(r);
  };

  for (const p of CONTRAST_PAIRS) {
    const id = pairId(p);
    const fg = requireColor(colors, p.fg, id);
    const layers = [...baseKeys(p.base), p.bg].map(k => requireColor(colors, k, id));
    push(score(id, p.kind, fg, layers));
  }

  const editorBg = (id: string) => requireColor(colors, EDITOR_BG, id);

  for (const rule of theme.tokenColors ?? []) {
    const fg = rule.settings?.foreground;
    if (!fg) continue;
    const id = `token:${rule.name ?? [rule.scope ?? ""].flat().join(",")}|${EDITOR_BG}`;
    push(score(id, "text", fg, [editorBg(id)]));
  }

  for (const [selector, value] of Object.entries(theme.semanticTokenColors ?? {})) {
    const fg = typeof value === "string" ? value : value?.foreground;
    if (!fg) continue;
    const id = `semantic:${selector}|${EDITOR_BG}`;
    push(score(id, "text", fg, [editorBg(id)]));
  }

  // Code inks over the code stacks. An ink that already fails on the bare editor background is
  // scored there (above) and not again on every stack: its own color is the problem.
  for (const ink of codeInks(theme)) {
    if (wcagContrastRatio(ink.fg, editorBg(ink.label)) < WCAG_MIN.text) continue;
    for (const stack of CODE_STACKS) {
      const id = `code:${ink.label}|${stack}`;
      const layers = stack.split(">").map(k => requireColor(colors, k, id));
      push(score(id, "text", ink.fg, layers));
    }
  }

  return results;
}
