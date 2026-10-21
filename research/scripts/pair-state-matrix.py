#!/usr/bin/env python3
"""Part 2 of research/token-coverage.md: classify CONTRAST_PAIRS into SURFACE family x state x kind.
Input: pairs.json from research/scripts/dump-pairs.ts.
Surface = first family matched walking the background stack top -> bottom (so a diff or selection layer
over editor.background counts as diff/selection, not as plain editor). State = key-name regex over
fg + every stack key; tags overlap. Cells are `text/icon` pair counts (kind text vs ui); fg keys that are
borders/outlines/dividers are counted separately as `border`."""
import collections, json, re, sys

P = json.load(open(sys.argv[1]))["pairs"]
SURF = [("diff/merge", r"^(diffEditor|merge|multiDiff)"),
 ("chat/agents", r"^(chat|agents|inlineChat|interactive|activeSessionView|inactiveSessionView|agentFeedback|agentSession|agentStatus)"),
 ("terminal", r"^terminal"), ("tabs", r"^(tab\.|modernTab|modernEditorTab|editorGroup)"),
 ("activity bar", r"^(activityBar|modernActivityBar|activity(Warning|Error)Badge|profileBadge)"),
 ("status bar", r"^statusBar"), ("menus/title bar", r"^(menu|menubar|commandCenter|titleBar)"),
 ("notifications", r"^(notification|banner)"),
 ("quick input/dialogs/widgets", r"^(quickInput|pickerGroup|editorWidget|editorSuggest|editorHover|editorActionList|peekView(?!Editor)|welcomePage|walkThrough)"),
 ("buttons/inputs/badges", r"^(button|input|checkbox|radio|dropdown|badge|extensionButton|extensionBadge|keybinding|settings|toolbar|progress|inlineEdit|listFilter)"),
 ("lists/trees", r"^(list|tree)"), ("minimap/gutter", r"^(minimap|editorGutter|editorOverviewRuler|editorStickyScrollGutter)"),
 ("sidebar/panel", r"^(sideBar|panel|outputView|breadcrumb)"), ("notebook", r"^notebook"),
 ("editor", r"^(editor|peekViewEditor|searchEditor|testing|debug|scm)")]
HOVER_NOT = r"editorHoverWidget|historyItemHover"  # hover *widgets*, not hover *state*


def surface(p):
    for k in [p["bg"], *reversed(p.get("base") or [])]:
        for n, r in SURF:
            if re.search(r, k): return n
    return "other"


def tags(p):
    s = " ".join([p["fg"], p["bg"]] + (p.get("base") or []))
    t = set()
    if re.search("hover", re.sub(HOVER_NOT, "", s), re.I): t.add("hover")
    if re.search("focus", s, re.I): t.add("focus")
    if re.search("inactive|unfocused", s, re.I): t.add("inactive")
    if re.search("selection|selected", s, re.I): t.add("selected")
    if "selected" in t and "focus" in t: t.add("selected+focus")
    if re.search("disabled", s, re.I): t.add("disabled")
    if re.search(r"(^|\.)active|[a-z]Active|pressed", s) and "selected" not in t: t.add("active")
    return t or {"rest"}


def kind(p):
    return "border" if re.search(r"border|outline|stroke|separator|divider", p["fg"], re.I) else ("text" if p["kind"] == "text" else "icon")


cols = ["rest", "hover", "active", "focus", "selected", "selected+focus", "inactive", "disabled"]
M = collections.defaultdict(lambda: collections.defaultdict(collections.Counter)); N = collections.Counter()
for p in P:
    s = surface(p); N[s] += 1
    for t in tags(p): M[s][t][kind(p)] += 1
cell = lambda c: f"{c['text']}/{c['icon']}" + (f"+{c['border']}b" if c["border"] else "")
print("Cells: text/icon pairs (+Nb = border pairs)\n")
print("| surface | pairs | " + " | ".join(cols) + " |\n|---|---|" + "---|" * len(cols))
tot = collections.defaultdict(collections.Counter)
for s, n in N.most_common():
    for c in cols: tot[c].update(M[s][c])
    print(f"| {s} | {n} | " + " | ".join(cell(M[s][c]) for c in cols) + " |")
print(f"| **total** | {len(P)} | " + " | ".join(cell(tot[c]) for c in cols) + " |")
kc = collections.Counter(kind(p) for p in P)
print("\nkinds:", dict(kc), "| distinct fg:", len({p["fg"] for p in P}))
print("border-like fg keys:", sorted({p["fg"] for p in P if kind(p) == "border"}))
ic = sorted({p["fg"] for p in P if kind(p) == "icon" and tags(p) - {"rest"} and re.search("icon", p["fg"], re.I)})
print("icon-foreground keys in a non-rest state:", ic)
