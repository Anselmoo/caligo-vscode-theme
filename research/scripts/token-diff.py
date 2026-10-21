#!/usr/bin/env python3
"""Part 1a/1d of research/token-coverage.md: upstream workbench colour ids vs. what Caligo emits.

Needs: `npm run generate --silent` already run (themes/Caligo-*.json), network, and optionally a
registerColor scan (research/scripts/registry-scan.sh -> $SCAN/reg.json) to widen the universe.
Usage: python3 research/scripts/token-diff.py [path/to/reg.json]
"""
import glob, json, re, sys, urllib.request

RAW = "https://raw.githubusercontent.com/microsoft/vscode/{}/build/lib/stylelint/vscode-known-variables.json"
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())  # case/punctuation-insensitive


def known(tag):
    d = json.load(urllib.request.urlopen(RAW.format(tag)))["colors"]
    return {norm(x[len("--vscode-"):]): x[len("--vscode-"):] for x in d}, len(d)


ours = set()
for f in glob.glob("themes/Caligo-*.json"):
    ours |= set(json.load(open(f))["colors"])
on = {norm(k): k for k in ours}
print(f"themes={len(glob.glob('themes/Caligo-*.json'))} emitted-union={len(ours)}")

for tag in ["main", "1.142.0", "1.116.0", "1.108.1"]:
    u, raw = known(tag)
    print(f"{tag:8} raw={raw} normalised={len(u)} missing={len(set(u)-set(on))} extra={len(set(on)-set(u))}")

# growth per release (colours only)
prev = None
for v in range(108, 143):
    try:
        u, raw = known(f"1.{v}.0")
    except Exception:
        continue
    if prev is not None and (set(u) - prev or prev - set(u)):
        print(f"1.{v}.0 total={raw} +{len(set(u)-prev)} -{len(prev-set(u))}")
    prev = set(u)

if len(sys.argv) > 1:  # widen with registerColor ids + extension-contributed colours
    reg = json.load(open(sys.argv[1]))
    U = dict(known("main")[0])
    for i in list(reg["ids"]) + list(reg["ext"]):
        U.setdefault(norm(i), i)
    print(f"universe(known+registerColor+extensions)={len(U)} missing={len(set(U)-set(on))}")
    print("emitted but not in universe:", sorted(on[k] for k in set(on) - set(U)))
