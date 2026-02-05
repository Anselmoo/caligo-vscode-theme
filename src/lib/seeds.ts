import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertValidSeed, type Seed } from "./constraints.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Expand a seed with variants into multiple seeds.
 * Returns an array: [baseSeed, ...expandedVariants]
 */
export function expandSeedVariants(seed: Seed): Seed[] {
  const variants = seed.variants ?? [];
  const results: Seed[] = [seed];

  for (const variant of variants) {
    const expandedSeed: Seed = {
      ...seed,
      id: `${seed.id}${variant.id}`,
      displayName: `${seed.displayName} — ${variant.displayName}`,
      harmony: variant.harmony ?? seed.harmony,
      syntaxStyle: variant.syntaxStyle ?? seed.syntaxStyle,
      contrastTarget: variant.contrastTarget ?? seed.contrastTarget,
      semantic: variant.semantic ?? seed.semantic,
      intentEmphasis: variant.intentEmphasis ?? seed.intentEmphasis,
      // Variants should not recursively expand further variants
      variants: undefined,
    };
    results.push(expandedSeed);
  }

  return results;
}

export async function loadAllSeeds(): Promise<Seed[]> {
  // Works from both `src/` (ts-node) and `dist/` (compiled) layouts.
  // - src:  <root>/src/lib/seeds.ts
  // - dist: <root>/dist/lib/seeds.js
  const projectRoot = path.resolve(__dirname, "..", "..");
  const seedsDir = path.join(projectRoot, "src", "seeds");

  let entries: string[];
  try {
    entries = await fs.readdir(seedsDir);
  } catch {
    return [];
  }

  const jsonFiles = entries
    .filter(f => f.toLowerCase().endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const seeds: Seed[] = [];

  for (const file of jsonFiles) {
    const fullPath = path.join(seedsDir, file);
    const raw = await fs.readFile(fullPath, "utf8");
    const parsed = JSON.parse(raw) as Seed;
    assertValidSeed(parsed);

    seeds.push(parsed);
  }

  // Sort seeds alphabetically by id for stable ordering
  return seeds.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadSeedById(id: string): Promise<Seed | undefined> {
  const all = await loadAllSeeds();
  const direct = all.find(s => s.id.toLowerCase() === id.toLowerCase());
  if (direct) return direct;

  // Also allow looking up expanded variants by id (e.g., MidnightAtelierAnalogous)
  for (const seed of all) {
    const expanded = expandSeedVariants(seed).slice(1);
    const match = expanded.find(v => v.id.toLowerCase() === id.toLowerCase());
    if (match) return match;
  }

  return undefined;
}

export function validateSeed(seed: Seed): void {
  // Compatibility wrapper used by tests: throw on invalid seeds
  assertValidSeed(seed);
}
