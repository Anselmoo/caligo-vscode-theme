/**
 * SVG Template Engine — loads .svg reference files from this directory,
 * substitutes {{variable}} placeholders with typed values, and parses the
 * result into a BrickOutput compatible with the wallpaper composition layer.
 *
 * Usage:
 *   import { renderTemplate } from "../templates/engine.js";
 *   const out = renderTemplate("bloom-ellipse.svg", { filterId: "b1", blur: 40, ... });
 *
 * SVG files in this directory are valid SVG documents and serve as visual
 * references (openable in any browser or design tool). TypeScript drives all
 * numeric computation; the .svg files own the geometry and structure.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrickOutput } from "../types.js";

const TEMPLATES_DIR = dirname(fileURLToPath(import.meta.url));
const FRAGMENTS_DIR = join(TEMPLATES_DIR, "fragments");
const SCENES_DIR = join(TEMPLATES_DIR, "scenes");

/**
 * Replaces all `{{key}}` occurrences in `template` with the corresponding
 * value from `vars`. Throws if a placeholder has no matching key.
 */
export function applyVars(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (!(key in vars)) {
      throw new Error(`SVG template missing variable: '${key}'`);
    }
    return String(vars[key]);
  });
}

/**
 * Loads an SVG template file by name from this directory.
 */
export function loadTemplate(filename: string): string {
  return readFileSync(join(TEMPLATES_DIR, filename), "utf-8");
}

/**
 * Reads an SVG fragment file by name from the fragments/ subdirectory.
 */
export function loadFragment(name: string): string {
  return readFileSync(join(FRAGMENTS_DIR, `${name}.svg`), "utf-8");
}

/**
 * Parses an SVG document string into a BrickOutput by extracting:
 *   - `defs`: content inside <defs>...</defs> (if present)
 *   - `elements`: remaining body elements with the root <svg> wrapper stripped
 *
 * Comments (<!-- ... -->) and the XML declaration are removed from output.
 */
export function parseBrickOutput(svg: string): BrickOutput {
  // Strip XML declaration and comments
  const cleaned = svg
    .replace(/<\?xml[^?]*\?>\s*/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Extract <defs>...</defs> inner content
  const defsMatch = cleaned.match(/<defs[^>]*>([\s\S]*?)<\/defs>/);
  const defs = defsMatch ? defsMatch[1].trim() : undefined;

  // Strip root <svg> wrapper and <defs> block, keep body elements
  const elements = cleaned
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .replace(/<defs[^>]*>[\s\S]*?<\/defs>/, "")
    .trim();

  return defs !== undefined ? { defs, elements } : { elements };
}

/**
 * Loads an SVG template file, substitutes all {{key}} placeholders, and
 * returns a BrickOutput ready to merge into a wallpaper composition.
 *
 * @param filename  - filename relative to src/wallpaper/templates/ (e.g. "bloom-ellipse.svg")
 * @param vars      - map of placeholder names to their computed values
 */
export function renderTemplate(
  filename: string,
  vars: Record<string, string | number>
): BrickOutput {
  const raw = loadTemplate(filename);
  const substituted = applyVars(raw, vars);
  return parseBrickOutput(substituted);
}

// ─── Scene Assembly ───────────────────────────────────────────────────────────

interface SceneLayer {
  fragment: string;
  z: number;
}

interface SceneManifest {
  id: string;
  layers: SceneLayer[];
}

/**
 * Reads and parses a scene manifest JSON from the scenes/ subdirectory.
 */
export function loadSceneManifest(sceneId: string): SceneManifest {
  const raw = readFileSync(join(SCENES_DIR, `${sceneId}.scene.json`), "utf-8");
  return JSON.parse(raw) as SceneManifest;
}

/**
 * Assembles a scene from its manifest: loads each fragment in z-order, applies
 * the shared vars map, and concatenates defs + elements into one BrickOutput.
 *
 * @param sceneId - matches a <sceneId>.scene.json file in scenes/
 * @param vars    - complete token map for all fragments in the scene
 */
export function assembleScene(
  sceneId: string,
  vars: Record<string, string>
): BrickOutput {
  const manifest = loadSceneManifest(sceneId);
  const layers = [...manifest.layers].sort((a, b) => a.z - b.z);
  let allDefs = "";
  let allElements = "";
  for (const layer of layers) {
    const raw = loadFragment(layer.fragment);
    const filled = applyVars(raw, vars);
    const parsed = parseBrickOutput(filled);
    if (parsed.defs) allDefs += `\n${parsed.defs}`;
    allElements += `\n${parsed.elements}`;
  }
  const defsResult = allDefs.trim();
  return defsResult
    ? { defs: defsResult, elements: allElements.trim() }
    : { elements: allElements.trim() };
}
