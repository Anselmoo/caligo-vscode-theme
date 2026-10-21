/**
 * Refresh src/lib/__fixtures__/vscode-colors.json: the pinned list of workbench colour ids that
 * VS Code itself defines, which tests/verification/vscode-color-coverage.test.ts checks every
 * generated theme against. Network happens here and nowhere else.
 *
 *   npm run vscode:colors:refresh                  # re-pin to the tag already in the fixture
 *   npm run vscode:colors:refresh -- --tag 1.143.0 # move the pin
 *   npm run vscode:colors:refresh -- --tag main --out /tmp/main.json   # drift check, fixture untouched
 *
 * Sources (the union is the fixture):
 *  - `known`      build/lib/stylelint/vscode-known-variables.json "colors" (`--vscode-a-b` -> `a.b`).
 *                 It lags the source, so it is not trusted alone.
 *  - `registered` every `registerColor('<id>', ...)` call under src/vs of the tag's source archive;
 *                 a fifth argument (deprecationMessage) marks the id deprecated.
 *  - `extension:<name>` `contributes.colors` of extensions/<name>/package.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = join(root, "src", "lib", "__fixtures__", "vscode-colors.json");
const REPO = "microsoft/vscode";

export interface FixtureColor {
  id: string;
  sources: string[];
  deprecated?: true;
}
export interface Fixture {
  vscodeVersion: string;
  sourceCommit: string;
  fetchedAt: string;
  colors: FixtureColor[];
}

// ── minimal tar reader (ustar + pax/GNU long names), keeps only wanted files ─────────────────────
export function readTar(tar: Buffer, want: (path: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  let off = 0;
  let longName: string | undefined;
  const str = (b: Buffer) => b.toString("utf8").replace(/\0.*$/s, "");
  while (off + 512 <= tar.length) {
    const h = tar.subarray(off, off + 512);
    if (h.every(b => b === 0)) break;
    const size = Number.parseInt(str(h.subarray(124, 136)).trim() || "0", 8);
    const type = String.fromCharCode(h[156]);
    const body = tar.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === "L") {
      longName = str(body);
      continue;
    }
    if (type === "x") {
      const m = /\d+ path=([^\n]+)\n/.exec(body.toString("utf8"));
      if (m) longName = m[1];
      continue;
    }
    if (type === "g") continue;
    const prefix = str(h.subarray(345, 500));
    const name =
      longName ?? (prefix ? `${prefix}/${str(h.subarray(0, 100))}` : str(h.subarray(0, 100)));
    longName = undefined;
    if (type !== "0" && type !== "\0") continue;
    const path = name.slice(name.indexOf("/") + 1);
    if (want(path)) out.set(path, body.toString("utf8"));
  }
  return out;
}

// ── registerColor argument parsing (string/comment/paren aware) ─────────────────────────────────
export function registerColorCalls(src: string): Array<{ id: string; deprecated: boolean }> {
  const calls: Array<{ id: string; deprecated: boolean }> = [];
  const re = /registerColor\(/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    let i = m.index + m[0].length;
    const args: string[] = [];
    let depth = 0;
    let start = i;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "'" || c === '"' || c === "`") {
        for (i++; i < src.length && src[i] !== c; i++) if (src[i] === "\\") i++;
      } else if (c === "/" && src[i + 1] === "/") {
        while (i < src.length && src[i] !== "\n") i++;
      } else if (c === "/" && src[i + 1] === "*") {
        i = src.indexOf("*/", i + 2) + 1;
      } else if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) {
        if (depth === 0) {
          args.push(src.slice(start, i));
          break;
        }
        depth--;
      } else if (c === "," && depth === 0) {
        args.push(src.slice(start, i));
        start = i + 1;
      }
    }
    const id = /^\s*(?:\/\/[^\n]*\n\s*)*['"]([^'"]+)['"]\s*$/.exec(args[0] ?? "")?.[1];
    if (!id) continue; // computed ids (helpers, loops) are covered by the known-variables list
    const fifth = (args[4] ?? "").trim();
    calls.push({ id, deprecated: fifth !== "" && fifth !== "undefined" });
  }
  return calls;
}

async function get(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "user-agent": "caligo-refresh-vscode-colors" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function build(tag: string): Promise<Fixture> {
  const known = JSON.parse(
    (
      await get(
        `https://raw.githubusercontent.com/${REPO}/${tag}/build/lib/stylelint/vscode-known-variables.json`
      )
    ).toString()
  ).colors as string[];
  const commit = JSON.parse(
    (await get(`https://api.github.com/repos/${REPO}/commits/${tag}`)).toString()
  ).sha as string;
  const archive = gunzipSync(await get(`https://codeload.github.com/${REPO}/tar.gz/${commit}`));
  const files = readTar(
    archive,
    p =>
      (/^src\/vs\/.+\.ts$/.test(p) && !/\/test\//.test(p)) ||
      /^extensions\/[^/]+\/package\.json$/.test(p)
  );

  const byId = new Map<string, FixtureColor>();
  const add = (id: string, source: string, deprecated = false) => {
    const e = byId.get(id) ?? { id, sources: [] };
    if (!e.sources.includes(source)) e.sources.push(source);
    if (deprecated) e.deprecated = true;
    byId.set(id, e);
  };
  for (const v of known) add(v.replace(/^--vscode-/, "").replace(/-/g, "."), "known");
  for (const [path, text] of files) {
    if (path.endsWith(".ts")) {
      if (!text.includes("registerColor(")) continue;
      for (const c of registerColorCalls(text)) add(c.id, "registered", c.deprecated);
    } else {
      const colors = (JSON.parse(text).contributes?.colors ?? []) as Array<{ id: string }>;
      const ext = path.split("/")[1];
      for (const c of colors) add(c.id, `extension:${ext}`);
    }
  }
  return {
    vscodeVersion: tag,
    sourceCommit: commit,
    fetchedAt: new Date().toISOString(),
    colors: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const tag = arg("tag") ?? (JSON.parse(readFileSync(FIXTURE, "utf8")) as Fixture).vscodeVersion;
  const fixture = await build(tag);
  const out = arg("out") ?? FIXTURE;
  writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`);
  const dep = fixture.colors.filter(c => c.deprecated).length;
  console.log(
    `${out}: VS Code ${tag} (${fixture.sourceCommit.slice(0, 10)}), ${fixture.colors.length} ids, ${dep} deprecated`
  );
}
