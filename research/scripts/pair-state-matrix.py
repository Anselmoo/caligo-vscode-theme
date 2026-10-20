#!/usr/bin/env python3
"""Part 2 of research/token-coverage.md: classify CONTRAST_PAIRS into surface family x state.
Input: pairs.json from research/scripts/dump-pairs.ts. Heuristic (key-name regex), tags overlap."""
import collections, json, re, sys

P = json.load(open(sys.argv[1]))["pairs"]
FAM = [("chat/agents", r"^(chat|agents|inlineChat|interactive|activeSessionView|inactiveSessionView|agentFeedback)"),
 ("terminal", r"^terminal"), ("tabs", r"^(tab\.|modernTab|modernEditorTab|editorGroup)"),
 ("activity bar", r"^(activityBar|modernActivityBar|activity(Warning|Error)Badge|profileBadge)"),
 ("status bar", r"^statusBar"), ("lists/trees", r"^(list|tree|listFilter)"),
 ("quick input/widgets", r"^(quickInput|pickerGroup|editorWidget|editorSuggest|editorHover|editorActionList|peekView|welcomePage|walkThrough)"),
 ("menus/title bar", r"^(menu|menubar|commandCenter|titleBar)"),
 ("buttons/inputs/badges", r"^(button|input|checkbox|radio|dropdown|badge|extensionButton|extensionBadge|keybinding|settings|toolbar|progress|textLink|textPreformat|textCodeBlock|textBlockQuote)"),
 ("notifications", r"^(notification|banner)"), ("diff/merge", r"^(diffEditor|merge|multiDiff)"),
 ("minimap/gutter/ruler", r"^(minimap|editorGutter|editorOverviewRuler|editorLineNumber|editorFold)"),
 ("sidebar/panel", r"^(sideBar|panel|outputView|breadcrumb|sash)"),
 ("scm/debug/testing/notebook/icons", r"^(scm|gitDecoration|debug|testing|notebook|symbolIcon|charts|ports|problems|gauge|markdownAlert|welcome)"),
 ("editor text/tokens", r"^(editor|token:|semantic:)")]
HOVER_NOT = r"editorHoverWidget|historyItemHover"  # hover *widgets*, not hover *state*


def family(p):
    return next((n for n, r in FAM if re.search(r, p["fg"])), "other (foreground/descriptionForeground/icon.foreground...)")


def tags(p):
    s = " ".join([p["fg"], p["bg"]] + (p.get("base") or []))
    t = set()
    if re.search("hover", re.sub(HOVER_NOT, "", s), re.I): t.add("hover")
    if re.search("focus", s, re.I): t.add("focus")
    if re.search("inactive|unfocused", s, re.I): t.add("inactive")
    if re.search("selection|selected", s, re.I): t.add("selected")
    if re.search("disabled", s, re.I): t.add("disabled")
    if re.search(r"(^|\.)active|[a-z]Active|pressed", s) and "selected" not in t: t.add("active")
    return t or {"rest"}


cols = ["rest", "hover", "active", "focus", "selected", "inactive", "disabled"]
M = collections.defaultdict(collections.Counter); N = collections.Counter()
for p in P:
    f = family(p); N[f] += 1
    for t in tags(p): M[f][t] += 1
print("| family | pairs | " + " | ".join(cols) + " |\n|---|---|" + "---|" * len(cols))
for f, n in N.most_common():
    print(f"| {f} | {n} | " + " | ".join(str(M[f][c]) for c in cols) + " |")
print("| **total** | %d | " % len(P) + " | ".join(str(sum(M[f][c] for f in M)) for c in cols) + " |")
b = [p for p in P if re.search(r"border|outline|stroke|separator|divider", p["fg"], re.I)]
print("\nfg keys that are borders/outlines/dividers:", len(b), sorted({p["fg"] for p in b}))
print("kinds:", dict(collections.Counter(p["kind"] for p in P)), "| distinct fg:", len({p["fg"] for p in P}))
