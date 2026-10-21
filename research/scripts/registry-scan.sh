#!/usr/bin/env bash
# Scan microsoft/vscode main for registerColor ids and extension-contributed colours (Part 1a/1b).
# Output: $OUT/reg.json  {"ids":[...], "ext":{id: extension}}
set -euo pipefail
OUT=${OUT:-$(mktemp -d)}; mkdir -p "$OUT/x"
curl -sL https://codeload.github.com/microsoft/vscode/tar.gz/refs/heads/main -o "$OUT/vscode-main.tgz"   # ~64 MB
tar -xzf "$OUT/vscode-main.tgz" -C "$OUT/x" --include '*/src/vs/*.ts' --include '*/extensions/*/package.json'
python3 - "$OUT" <<'PY'
import glob, json, re, subprocess, sys
out = sys.argv[1]; root = glob.glob(out + "/x/vscode-*")[0]
src = subprocess.run(f"grep -rhE -A2 'registerColor\\(' {root}/src", shell=True, capture_output=True, text=True).stdout
ids = sorted(set(re.findall(r"registerColor\(\s*'([^']+)'", src)))
ext = {}
for f in glob.glob(root + "/extensions/*/package.json"):
    for c in json.load(open(f)).get("contributes", {}).get("colors", []) or []:
        ext[c["id"]] = f.split("/")[-2]
json.dump({"ids": ids, "ext": ext}, open(out + "/reg.json", "w"))
print(f"registerColor ids={len(ids)} extension colours={len(ext)} -> {out}/reg.json")
PY
