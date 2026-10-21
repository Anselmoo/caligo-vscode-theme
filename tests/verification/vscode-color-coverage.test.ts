/**
 * VS Code colour coverage gate.
 *
 * Every non-deprecated workbench colour that VS Code defines (src/lib/__fixtures__/vscode-colors.json,
 * pinned to one release, refreshed with `npm run vscode:colors:refresh`) must be emitted by all
 * generated themes, or be listed in scripts/vscode-colors-skips.json with a reason. Every emitted key
 * must be a VS Code colour (deprecated ones included) or be listed there as non-upstream. Entries that
 * stop being true are stale and fail, so both lists can only shrink. No network: the fixture is the
 * only upstream input.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface FixtureColor {
  id: string;
  sources: string[];
  deprecated?: boolean;
}
interface Fixture {
  vscodeVersion: string;
  sourceCommit: string;
  fetchedAt: string;
  colors: FixtureColor[];
}
interface Entry {
  id: string;
  reason: string;
}
interface Skips {
  version: number;
  skipped: Entry[];
  nonUpstream: Entry[];
}

const root = process.cwd();
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, "src/lib/__fixtures__/vscode-colors.json"), "utf8")
) as Fixture;
const skips = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/vscode-colors-skips.json"), "utf8")
) as Skips;

const themesDir = path.join(root, "themes");
const themes = (fs.existsSync(themesDir) ? fs.readdirSync(themesDir) : [])
  .filter(f => /^Caligo-.+\.json$/.test(f))
  .sort()
  .map(f => ({
    name: f.replace(/\.json$/, ""),
    keys: new Set(
      Object.keys(
        (JSON.parse(fs.readFileSync(path.join(themesDir, f), "utf8")) as { colors: object }).colors
      )
    ),
  }));

const upstream = new Set(fixture.colors.map(c => c.id));
const required = fixture.colors.filter(c => !c.deprecated).map(c => c.id);
const skipped = new Set(skips.skipped.map(e => e.id));
const nonUpstream = new Set(skips.nonUpstream.map(e => e.id));
const emittedAnywhere = new Set(themes.flatMap(t => [...t.keys]));

describe("vscode-colors fixture", () => {
  it("is pinned to a release with a source commit and unique, sorted ids", () => {
    expect(fixture.vscodeVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(fixture.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
    const ids = fixture.colors.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it("every skip and non-upstream entry carries a reason", () => {
    expect(skips.version).toBe(1);
    for (const e of [...skips.skipped, ...skips.nonUpstream]) {
      expect(e.reason.trim().length, e.id).toBeGreaterThan(20);
    }
  });
});

describe("vscode colour coverage of the generated themes", () => {
  it("found the generated themes (run `npm run generate` first)", () => {
    expect(themes.length).toBeGreaterThan(0);
  });

  it("emits every non-deprecated VS Code colour in every theme, or skips it with a reason", () => {
    const missing = new Map<string, number>();
    for (const t of themes) {
      for (const id of required) {
        if (!t.keys.has(id) && !skipped.has(id)) missing.set(id, (missing.get(id) ?? 0) + 1);
      }
    }
    expect(
      [...missing].map(([id, n]) => `${id} (missing in ${n}/${themes.length} themes)`)
    ).toEqual([]);
  });

  it("emits only VS Code colours, or lists the key as non-upstream with a reason", () => {
    const unknown = [...emittedAnywhere].filter(k => !upstream.has(k) && !nonUpstream.has(k));
    expect(unknown.sort()).toEqual([]);
  });

  it("has no stale skip: a skipped id must exist upstream and must not be emitted by every theme", () => {
    const stale = skips.skipped
      .filter(e => !upstream.has(e.id) || themes.every(t => t.keys.has(e.id)))
      .map(e => e.id);
    expect(stale).toEqual([]);
  });

  it("has no stale non-upstream entry: it must be emitted and still absent upstream", () => {
    const stale = skips.nonUpstream
      .filter(e => upstream.has(e.id) || !emittedAnywhere.has(e.id))
      .map(e => e.id);
    expect(stale).toEqual([]);
  });
});
