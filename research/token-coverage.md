# Token coverage and contrast-state audit — 2026-10-20

Base: `21c6f7e` (main) + `npm run generate --silent` → 50 themes. Part 2 reads the **uncommitted** Run-1 code in the worktree `caligo-tokens-wallpapers-cdab7e` (`src/lib/contrast-pairs.ts`, 1503 lines). VS Code stable = **1.142.0** (published 2026-10-14, `curl -s https://api.github.com/repos/microsoft/vscode/releases/latest`); `main` already reports `version: 1.144.0` (`…/main/package.json`), Insiders = 1.143 (`code.visualstudio.com/updates/v1_143`, draft page). Every number below is reproducible with `research/scripts/` (commands inline).

## Summary

- We emit **940** colour keys (identical in all 50 themes). Upstream has **990** ids in `vscode-known-variables.json` (989 after case/punctuation normalisation). The prior measurement (65 missing, 15 extra) **reproduces exactly**.
- The known-variables file **lags the source**: scanning `registerColor(` in `main` plus extension manifests gives a 1006-id universe. Against it we miss **68** and have **1** unexplained extra. Use the union, not the file alone.
- All 65 file-listed gaps already exist in **stable 1.142.0**; none is Insiders-only. Nearly all gaps are `agents*`, `chat.*` and "modern UI" ids.
- Growth: +94 ids since the ^1.108 pin (896 → 990, Jan → Oct 2026) and +76 in the last 26 releases (1.116 → 1.142, one release per week, ≈2.9 per release), with bursts of 20+. A one-off catch-up will not hold.
- Part 2: the engine scores **foreground-over-surface only**. Of 681 pairs, **1** has a border/outline as the foreground. Focus rings, boundaries and hover-vs-rest distance are unscored, and the probe below shows real failures there.

## Part 1 — Token coverage

### 1a. Workbench colours

`python3 research/scripts/token-diff.py <reg.json>` (reg.json from `research/scripts/registry-scan.sh`).

| Source | Date | Raw ids | Normalised | We miss | We have extra |
|---|---|---|---|---|---|
| tag 1.108.1 (our engines floor) | 2026-01-16 | 896 | 895 | 3 | 47 |
| tag 1.116.0 (~6 months back) | 2026-04-15 | 914 | 913 | 12 | 38 |
| tag 1.142.0 (stable) | 2026-10-14 | 990 | 989 | 65 | 15 |
| `main` (colours list) | 2026-10-20 | 990 | 989 | 65 | 15 |
| universe: known ∪ `registerColor` ∪ extension manifests (`main`) | | — | 1006 | **68** | **1** |

990 vs 989: `quickInput.list.focusBackground` and `quickInputList.focusBackground` collide after normalising. `main` equals 1.142.0 for colours; the file's `others`/`sizes` sections are what grew. Growth per release is in `research/scripts/token-diff.out.txt`; the largest steps are 1.117 (+20/−8, `sessions*`→`agents*` rename), 1.134 (+23) and 1.138 (+8).

**Missing (68)**, scan via `research/scripts/registry-scan.sh`; defining file = file whose `registerColor(` call names the id:

| Group | n | Ids (prefix omitted where shared) | Defined in (`registerColor('<id>'` match) |
|---|---|---|---|
| Agents window | 34 | `agents.background`; `agentsPanel`.{background,border,foreground}; `agentsChatInput`.{background,border,focusBorder,foreground,placeholderForeground}; `agentsNewSessionButton`.{background,border,foreground,hoverBackground}; `agentsBadge`/`agentsUnreadBadge`.{background,foreground}; `agentsCard.border`; `agentsDetail.background`; `agentsBottomPanel.border`; `agentsGradient.tintColor`; `agentsUpdateButton`.{downloaded,downloading}Background; `activeSessionView`/`inactiveSessionView`.{background,foreground}; `agentFeedbackEditorWidget`.{background,border}; `agentFeedbackInputWidget.border`; `agentsMobileDiff`.{added,deleted,modified}Foreground; `editorOverviewRuler.agentFeedbackForeground` | `workbench/common/agentsColors.ts` (30), `src/vs/sessions/**` (4) |
| chat (workbench) | 12 | `chat.`{findMatchBackground, findMatchHighlightBackground, statusBackground, inputWorkingBorderColor1..3, sessionStateIndicator.{inProgress,needsInput,unvisited}Border, workingProgress{Insiders,Stable}IconForeground, mcpCompatibilityWarningForeground} | `contrib/chat/common/widget/chatColors.ts` (11), `aiCustomizationColors.ts` (`mcpCompatibilityWarningForeground`) |
| chat voice | 4 | `chat.`{dictationActiveMicGlow, voiceGlowBaseColor, voiceListeningGlow, voiceSpeakingGlow} | `chatColors.ts` (4) |
| modern UI shell | 11 | `modernUI`.{shellBackground,inactiveShellBackground}; `modernActivityBar`.{background,inactiveBackground,border}; `modernActivityBarItem`.{active,hover}{Background,Foreground}; `modernPanel.border`; `modernSash.gripForeground` | `workbench/common/theme.ts` |
| classic | 7 | `statusBar.inactiveBackground`, `tab.divider`, `editorGroupHeader.connectedTabsBackground`, `editorWordWrapIndicator.foreground`, `inlineChat.regionHighlight` (no static `registerColor` found), `contrastBorder`, `contrastActiveBorder` | `theme.ts` (3), `editorColorRegistry.ts` (1), `baseColors.ts` (2), none (`inlineChat.regionHighlight`) |

`contrastBorder`/`contrastActiveBorder` are a deliberate omission (high-contrast only, `src/lib/vscode-theme-extended.ts:12`). `modernActivityBar.background` and `.inactiveBackground` are registered at tag 1.142.0 (`curl …/1.142.0/src/vs/workbench/common/theme.ts`) but absent from the known file.

**Emitted but not in the known file (15) + 1:**

| Class | n | Ids |
|---|---|---|
| Extension-contributed (`extensions/git/package.json`, 11 colours) | 8 | `gitDecoration.`{conflicting,ignored,renamed,stageDeleted,stageModified,submodule,untracked}`ResourceForeground`, `git.blame.editorDecorationForeground` |
| Renamed, old ids still registered and flagged deprecated (`theme.ts:747`, rename in 1.136.0) | 4 | `modernActivityBar.`{active,hover}{Background,Foreground} → `modernActivityBarItem.*` |
| Valid core ids missing from the known file | 2 | `testing.coveredMinimapBackground`, `testing.uncoveredMinimapBackground` (`contrib/testing/browser/theme.ts:108`) |
| Unexplained, no static registration in `main` (removed or renamed; verify via `git log -S`) | 1 | `aiCustomizationManagement.sashBorder` |

**Schema:** `src/schema/vscode-entery-point.json` has 722 keys, last touched 2026-02-05 (`git log`). `grep` finds no reference in `src/`, `scripts/`, `tests/` or `package.json`. It lacks 219 emitted keys and 267 upstream ids, so it cannot serve as the source of truth.

### 1b. Extension-contributed colours

Only `extensions/git` contributes colours (11 ids). `merge-conflict`, `terminal-suggest`, `github`, `copilot` and the other 94 in-tree extensions contribute 0 (loop over `extensions/*/package.json` → `contributes.colors`). `microsoft/vscode-copilot-chat` `package.json` (v0.44.0, `raw.githubusercontent.com/microsoft/vscode-copilot-chat/main/package.json`) has no `contributes.colors`. Chat UI colours are core `chat.*`/`agents*` ids. Third-party extensions are out of scope.

### 1c. Semantic tokens and TextMate

Two authorities, compared in full: the [semantic highlight guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide) (three tables, parsed from the page HTML) and `src/vs/platform/theme/common/tokenClassificationRegistry.ts` on `main` (lines 545–597).

| | Docs | VS Code source | `semantic-token-registry.ts` |
|---|---|---|---|
| Types | 23 | 24 = docs + deprecated `member` | 23 = docs − **`label`** + **`modifier`** |
| Modifiers | 10 (declaration, definition, readonly, static, deprecated, abstract, async, modification, documentation, defaultLibrary) | 8 registered: docs − `definition`, `defaultLibrary` (the latter still has default-style mappings) | 10 = docs |

Findings: `label` is in docs and source but not in our registry (Caligo gap; the generated theme does emit a `label` selector). `modifier` is in neither docs nor source (an LSP-only type), yet the file header calls itself the "canonical VS Code" registry. Docs-vs-source drift, not ours: `definition` and `defaultLibrary` are documented but not registered as modifiers, and the docs' fallback table maps `struct` → `storage.type.struct` while the source probes `entity.name.type.struct`.

The generated themes carry 321 `semanticTokenColors` selectors (many per-language, with custom types such as `lifetime`, `symbol`, `module`; these only apply if the language server emits them) and 67 `tokenColors` rules over 159 scopes. Of the 33 fallback scopes VS Code probes for semantic defaults, 2 match no rule prefix: `entity.name.decorator`, `entity.name.namespace`.

### 1d. Upcoming

- **Measured main-vs-stable delta: 0 colour ids.** The known-variables file is identical at `main` and 1.142.0 (990/990), but that file lags, so I also diffed the source: for each of the 68 files containing `registerColor(` in the `main` tarball I fetched the same path at tag 1.142.0 and compared ids. Result: 970 ids on both sides, no file new in `main`, no id added or removed. So the 68 gaps above are all *already shipped in stable*; nothing is Insiders-only today (as of the `main` snapshot of 2026-10-20). Point-in-time result; the commits below show definitions still changing through 2026-10-06.
- Recent definition changes (commits touching `theme.ts` and `chatColors.ts` since 2026-06-20, `api.github.com/repos/microsoft/vscode/commits?path=…`): [#335056](https://github.com/microsoft/vscode/pull/335056) themeable shell colours, panel borders, resize grips (2026-09-08); [#337126](https://github.com/microsoft/vscode/pull/337126) and [#338796](https://github.com/microsoft/vscode/pull/338796) connected tabs (`tab.divider`, `editorGroupHeader.connectedTabsBackground`); [#336087](https://github.com/microsoft/vscode/pull/336087) chat working progress; [#334150](https://github.com/microsoft/vscode/pull/334150) session-state indicators; [#330340](https://github.com/microsoft/vscode/pull/330340) chat find; [#328455](https://github.com/microsoft/vscode/pull/328455), [#327713](https://github.com/microsoft/vscode/pull/327713) voice/dictation glow. Rename in `24ae5cf9` (2026-08-27).
- Release-notes signals with contrast impact: 1.141 frosted-glass overlays (blurred, translucent menus and pop-ups in the Agents window and, with the modernized UI, in editor windows; solid with high-contrast themes); 1.138 per-theme-kind chat backgrounds (request/response surfaces stay opaque); 1.141 compact layout density.
- Not found: any new colour id for terminal suggest/sticky scroll (the `terminalSymbolIcon.*` set is already complete in our output) or for editor "modes". Treat any claim of such ids as unverified.

### 1e. Mechanism (specification)

1. **Fixture** `src/lib/__fixtures__/vscode-colors.json`: `{vscodeVersion, sourceCommit, fetchedAt, known[], registered[{id, deprecated?}], extension[{id, ext}]}`, sorted, normalisation collisions recorded.
2. **Refresh script** `scripts/refresh-vscode-colors.ts` (`npm run vscode:colors:refresh -- --tag 1.142.0`): known-variables at the tag plus a `registerColor` scan (the `registry-scan.sh` logic; parse the 5th argument for deprecation). Never fetch in unit tests.
3. **Test** `vscode-color-coverage.test.ts` against the pinned fixture: every non-deprecated fixture id is emitted by all themes **or** listed in `scripts/vscode-colors-skips.json` (`{id, reason}`: `contrastBorder`, …); every emitted key is in the fixture **or** in a `non-upstream` list with a reason. Stale allowlist entries fail (same ratchet as `contrast-known-violations.json`). Seed the allowlist with today's 68 and shrink in Run 2.
4. **Drift job**: weekly CI cron runs refresh against `main` in dry-run and opens an issue when the diff is non-empty. PR gating uses the pinned fixture, so upstream drift never breaks an unrelated PR.
5. Same fixture gets a `semantic: {types, modifiers}` section parsed from `tokenClassificationRegistry.ts` with an equivalent test (closes the `label` gap).

## Part 2 — Contrast engine state coverage

### What exists (facts)

681 pairs, 322 distinct foreground keys, 377 `text` (4.5:1) and 304 `ui` (3:1); 34 exempt foregrounds (disabled/dimmed, overview rulers, ANSI black); tokenColors/semantic rules scored per theme over `editor.background`. Each pair is *a foreground over a layer stack*. APCA Lc is computed per pair but **not gated** (only syntax tiers, Lc 30–42, `semantic-token-quality.ts:10`). The syntax separation gate (`separation-gate.ts`) covers syntax roles only, no UI states.

### Coverage matrix (surface × state × kind)

`python3 research/scripts/pair-state-matrix.py pairs.json`. The surface is the first family matched walking the background stack top → bottom, so a diff or selection layer over `editor.background` counts as diff/selection. States are key-name regexes over the foreground and every stack key; one pair can carry several tags. "hover" excludes hover *widgets* (43+1 here vs 47 with a plain `/hover/` match). Cells are **text/icon** pair counts; `b` = border pairs.

| surface | pairs | rest | hover | active | focus | selected | selected+focus | inactive | disabled |
|---|---|---|---|---|---|---|---|---|---|
| sidebar/panel | 196 | 43/146 | 0/0 | 2/0 | 1/0 | 1/0 | 0/0 | 1/0 | 0/2 |
| editor | 129 | 71/42 | 3/0 | 6/0 | 1/0 | 5/0 | 0/0 | 1/0 | 0/1 |
| quick input/dialogs/widgets | 120 | 27/84 | 0/0 | 1/0 | 4/1 | 3/1 | 1/0 | 0/0 | 0/0 |
| lists/trees | 69 | 2/0 | 20/0 | 0/0 | 6/0 | 39/4 | 2/0 | 14/2 | 0/0 |
| terminal | 40 | 20/1 | 1/0 | 0/0 | 0/0 | 18/0 | 0/0 | 1/0 | 0/0 |
| buttons/inputs/badges | 40 | 26/3+1b | 6/0 | 2/0 | 1/0 | 0/0 | 0/0 | 2/0 | 0/0 |
| status bar | 17 | 9/0 | 7/0 | 1/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| tabs | 14 | 1/0 | 5/0 | 4/0 | 3/0 | 2/0 | 0/0 | 4/0 | 0/0 |
| activity bar | 12 | 5/2 | 0/1 | 0/2 | 0/0 | 0/0 | 0/0 | 0/2 | 0/0 |
| menus/title bar | 10 | 3/0 | 0/0 | 3/0 | 0/0 | 2/0 | 0/0 | 2/0 | 0/0 |
| notebook | 8 | 2/3 | 1/0 | 0/0 | 1/0 | 1/0 | 0/0 | 0/0 | 0/0 |
| minimap/gutter | 7 | 1/6 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| diff/merge | 6 | 6/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| chat/agents | 6 | 5/1 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| notifications | 5 | 4/1 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| other | 2 | 2/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| **total** | 681 | 227/289+1b | 43/1 | 19/2 | 17/1 | 71/5 | 3/0 | 25/4 | 0/3 |

Reading it (681 pairs = 377 text, 303 icon/glyph, 1 border):

- **Borders and outlines: 1 pair in total** (`listFilterWidget.noMatchesOutline`); no focus ring, no input/checkbox/dropdown boundary, no active-tab indicator is a foreground in any pair.
- **Icons** are almost entirely rest (289 of 303); state icons exist only as `list.activeSelectionIconForeground`, `list.inactiveSelectionIconForeground`, `quickInputList.focusIconForeground`, `editorSuggestWidget.selectedIconForeground` (selected/focus), 1 hover, 2 active, 4 inactive and 3 disabled pairs. No toolbar/action-bar hover icon, no tab close-button icon.
- **Selected+focused** has 3 text pairs (lists 2, quick input 1); its outline (`list.focusAndSelectionOutline`) is unscored and is where the probe finds failures.
- **Chat/agents**: 6 pairs sit on a chat surface (5 text, 1 icon), all rest. 14 pairs have a `chat.*`/`agents*` foreground, also all rest.
- **Hover** is covered for text on lists (20), status bar (7), tabs (5), buttons (6); the surface-vs-surface distance is not covered anywhere. The `sidebar/panel` row (196) is mostly icon foregrounds over sideBar/panel/editor at rest.
- Pressed/active-on-press is not expressible by key name; VS Code has few pressed keys.

### Evidence probe: what the missing rule types would find today

`CONTRAST_LIB=<wt>/src/lib/contrast.ts npx tsx research/scripts/state-probe.ts` (50 themes, alpha-composited, full output in `research/scripts/state-probe.out.md`).

| Check | Result | Themes failing |
|---|---|---|
| `focusBorder` (and `list.focusOutline`, `tab.activeBorder`, `activityBar.activeBorder`, `statusBarItem.focusBorder`) over sideBar / editor / panel, floor 3.0 | min 3.04 | 0/50 |
| `focusBorder` / `inputOption.activeBorder` over `input.background` | min **2.97** | 2/50 |
| `list.focusAndSelectionOutline` over `list.activeSelectionBackground` | min **2.20**, median 3.78 | 5/50 |
| `input.border` over `input.background` / `sideBar.background` | 1.03–1.05 / 1.06–1.10 | 50/50 |
| `input.background` over `sideBar.background` (alternative boundary) | 1.02–1.05 | 50/50 |
| `checkbox.border`, `dropdown.border` over sideBar; `editorWidget.border` over editor | 1.06–1.10; 1.07–1.15 | 50/50 |
| `menu.selectionBorder` | alpha 0 (`#00151900` in AuroraNoir), invisible by design | — |
| ΔE (OKLab ×100) hover vs rest: `list.hoverBackground` / `statusBarItem.hoverBackground` / `toolbar.hoverBackground` | 1.21–1.41 / 1.57–1.84 / 5.4–9.1 | list, status: 50/50 below 2.0 |
| `tab.hoverBackground` vs `tab.activeBackground` | **identical hex** in 50/50 themes; hover vs inactive ΔE 1.84–2.25 | 50/50 |
| `button.hoverBackground` vs `button.background` | identical in 3/50; ΔE < 2 in 8/50 | 8/50 |
| Selected/focus vs rest (list, menu, quickInputList) | ΔE ≥ 6.5 | 0/50 |

Whether sub-3:1 input and widget borders violate WCAG 1.4.11 depends on whether the border is *required* to identify the control; the probe shows the boundary is faint in every theme either way, and the engine cannot see it. Hover is the weak state, selection and focus are fine.

### Missing rule types, prioritised

| P | Rule | VS Code keys | Why / evidence |
|---|---|---|---|
| **P0** | **Boundary pair kind** (`border`): fg is a border/outline, adjacent colours are *both* the inner and outer stack; pass = min of both ≥ 3.0 | `focusBorder`, `list.focusOutline`, `list.focusAndSelectionOutline`, `list.inactiveFocusOutline`, `inputOption.activeBorder`, `statusBarItem.focusBorder`, `statusBar.focusBorder`, `activityBar.activeFocusBorder`, `inlineChatInput.focusBorder`, `agentsChatInput.focusBorder` (key missing), `input.border`, `checkbox.border`, `dropdown.border`, `button.border`, `editorWidget.border`, `notifications.border` | Only 1 border pair exists; probe finds real failures (2.20, 2.97) |
| **P0** | **State-distance kind** (`state`): `d(state stack, rest stack)` ΔE_ok×100 ≥ floor and `state ≠ rest` (hex identity) | `list.hoverBackground`, `tab.hoverBackground` vs `tab.activeBackground`, `statusBarItem.hoverBackground`, `button.hoverBackground`, `toolbar.hoverBackground`, `menu.selectionBackground`, `quickInputList.focusBackground`, `activityBar.activeBackground`, `chat.requestBubbleHoverBackground`, `agentsNewSessionButton.hoverBackground` (missing) | Both passing contrast does not make them tellable apart; 50/50 hover failures. Start report-only at ~2.0 (a commonly quoted OKLab just-noticeable difference; calibrate before gating) with a ratchet |
| **P0** | **Selected-indicator borders** against both neighbours (active tab vs inactive tabs and vs editor) | `tab.activeBorder`, `tab.activeBorderTop`, `tab.unfocusedActiveBorder`, `tab.selectedBorderTop`, `activityBar.activeBorder`, `panelTitle.activeBorder` | Passes today (≥ 3.04) so cheap to lock in |
| P1 | **Chat/agents surface**: 14 rest-only pairs today | `chat.requestBackground`, `chat.requestBubbleBackground`, `chat.slashCommandForeground`, `chat.avatarForeground`, plus every new `agents*` fg/bg and `chat.sessionStateIndicator.*Border`, `chat.inputWorkingBorderColor1..3`, `chat.statusBackground` as they are added in Run 2 | Largest uncovered growth area (34+16 ids) |
| P1 | **Inactive-window backgrounds**: pairs exist for inactive foregrounds, not the surfaces | `titleBar.inactiveBackground`, `statusBar.inactiveBackground` (missing), `modernUI.inactiveShellBackground` (missing), `tab.unfocused*Background`, `activityBar.inactiveBackground` | 29 inactive-tagged pairs, almost all fg |
| P1 | **Translucent/frosted surfaces** (1.141): allow a bounded backdrop instead of throwing on a translucent stack bottom; score against the lightest and darkest plausible backdrop | `menu.background`, `quickInput.background`, `editorWidget.background`, `editorHoverWidget.background`, `notifications.background` | Engine currently requires an opaque stack bottom; frosted glass breaks that assumption in the Agents window and the modernized UI |
| P1 | **Disabled floor** (not WCAG-required): gate a low floor (≈ 1.5:1 or APCA Lc 15) and `disabled ≠ enabled` | `disabledForeground`, `checkbox.disabled.foreground`, `list.invalidItemForeground`, `editorLineNumber.dimmedForeground` | 34 exempt foregrounds are reported only; a floor catches invisible text without contradicting the exemption |
| P2 | **APCA tiers for UI text by role** (labels, secondary/description, placeholder, icon). Today UI APCA is computed but ungated, and syntax tiers use Lc 30–42. Check the APCA-W3 lookup for the chosen font sizes before choosing numbers | `descriptionForeground`, `input.placeholderForeground`, `list.deemphasizedForeground`, `icon.foreground` | Lets APCA catch dark-mode light-on-dark cases where WCAG ratio over-reports |
| P2 | **Large-text 3:1**: not recommended for the editor or lists (user-set font size, 11–14 px UI). Optional only for headings (`settings.headerForeground`, `walkthrough.stepTitle.foreground`) | — | Adds exemptions we cannot verify render at ≥ 18 pt |
| P2 | **Selected+focused / hover-on-selected stacks** | `list.activeSelectionForeground` over `list.focusBackground`, `list.focusAndSelectionOutline` | The only failing outline case above lives here |

## Not verified

- The pair registry's layer-stack order is Run 1's own reading of VS Code rendering; I did not check VS Code's paint order.
- VS Code behaviour for unknown colour keys on older hosts (engines ^1.108) is not tested here. Check before relying on "extra keys are harmless".
- `aiCustomizationManagement.sashBorder`, `inlineChat.regionHighlight`, `gauge.*`, `chatManagement.sashBorder`: registered programmatically or removed; I did not trace them.
- Family/state tags in the matrix are key-name heuristics, not rendering semantics. The probe thresholds (ΔE 2.0, floor 1.5:1) are proposals, not standards.

## Reproduce

```bash
npm run generate --silent && node ./scripts/cleanup-themes.js
OUT=$TMP bash research/scripts/registry-scan.sh            # ~64 MB tarball
python3 research/scripts/token-diff.py $TMP/reg.json
CONTRAST_PAIRS_LIB=<wt>/src/lib/contrast-pairs.ts npx tsx research/scripts/dump-pairs.ts > pairs.json
python3 research/scripts/pair-state-matrix.py pairs.json
CONTRAST_LIB=<wt>/src/lib/contrast.ts npx tsx research/scripts/state-probe.ts
```
