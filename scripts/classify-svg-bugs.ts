/**
 * classify-svg-bugs.ts
 *
 * Scans all monitor-platform SVGs, detects known composition bugs, maps each
 * to its TypeScript source brick/motif, and emits:
 *   public/bug-report.json   — structured manifest
 *   public/bug-report.html   — dark-themed gallery with thumbnails + badges
 *
 * Run: npx tsx scripts/classify-svg-bugs.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WALLPAPERS_DIR = path.join(ROOT, "public", "wallpapers");
const OUT_JSON = path.join(ROOT, "public", "bug-report.json");
const OUT_HTML = path.join(ROOT, "public", "bug-report.html");

// ── Bug definitions ──────────────────────────────────────────────────────────

type Severity = "critical" | "moderate" | "minor";

interface SvgMetrics {
  svg: string;
  ids: string[];
  rectCount: number;
  pathCount: number;
  circleCount: number;
  blurCount: number;
  auroraCount: number;
  fileSizeKB: number;
}

interface BugDef {
  id: string;
  label: string;
  severity: Severity;
  description: string;
  brick: string;
  sourceFile: string;
  sourceLine?: string;
  fix: string;
  detect: (m: SvgMetrics) => boolean;
}

const BUGS: BugDef[] = [
  {
    id: "CORRUGATED_AURORA",
    label: "Corrugated aurora bands",
    severity: "critical",
    description:
      "Too many aurora bands (≥ 5) with curtain-skirt gradients filling inter-band gaps — corrugated metal / venetian blind pattern.",
    brick: "auroraGlowBrick",
    sourceFile: "src/wallpaper/bricks/landscape.ts",
    sourceLine: "~520–610",
    fix: "Reduce max band count to 4. Restructure curtain skirt so it extends only downward from bandCy.",
    detect: m => m.auroraCount >= 5,
  },
  {
    id: "AURORA_FEW_BANDS",
    label: "Aurora flat band (≤ 2 bands)",
    severity: "moderate",
    description:
      "Only 1–2 aurora bands across the full viewport width. With so few bands the inter-band dark gap is as wide as the band itself, making the curtain look like a sine-wave stripe rather than hanging drapery.",
    brick: "auroraGlowBrick",
    sourceFile: "src/wallpaper/bricks/landscape.ts",
    sourceLine: "~510–530",
    fix: "Enforce minimum bandCount = 3. Alternatively, make 2-band mode use a single wide soft band instead of two stripes.",
    detect: m => m.auroraCount >= 1 && m.auroraCount <= 2,
  },
  {
    id: "AURORA_CURTAIN_SKIRT",
    label: "Aurora curtain skirt overflow",
    severity: "moderate",
    description:
      "≥ 5 curtain-skirt gradients (cg* IDs) whose y1 starts above bandCy — adjacent skirts overlap and produce a banded glow stack. (Fixed when y1 = bandCy; threshold raised to 5 to allow 3–4 clean bands.)",
    brick: "auroraGlowBrick",
    sourceFile: "src/wallpaper/bricks/landscape.ts",
    sourceLine: "~580–600",
    fix: "Pin userSpaceOnUse y1 to bandCy (not bandCy - curtainH*0.25). Skirt extends only downward.",
    detect: m => m.ids.filter(id => /-cg\d/.test(id)).length >= 5,
  },
  {
    id: "WATER_STRIPE",
    label: "Full-width water reflection stripe",
    severity: "moderate",
    description:
      "waterReflectionBrick -fade gradient's first stop has non-zero opacity → hard horizontal waterline edge visible under terrain silhouettes. Fixed by adding a 0%-opacity top stop.",
    brick: "waterReflectionBrick",
    sourceFile: "src/wallpaper/bricks/landscape.ts",
    sourceLine: "~300–340",
    fix: "Start the -fade gradient at stop-opacity=0 and ramp in over 14–38%. Clip to terrain gap for complete fix.",
    detect: m => {
      if (!m.ids.some(id => /-ripple$/.test(id))) return false;
      // Hard edge: a -fade gradient whose first stop at 0% has non-zero opacity.
      return /id="[^"]*-fade"[\s\S]{0,200}offset="0%"[^/]*stop-opacity="0\.[1-9]/.test(m.svg);
    },
  },
  {
    id: "UFO_VOLCANO",
    label: "UFO-cap volcano peak",
    severity: "moderate",
    description:
      "volcanoBrick places a flat ellipse at the crater peak that reads as a flying saucer silhouette instead of a volcanic cone tip.",
    brick: "volcanoBrick",
    sourceFile: "src/wallpaper/bricks/architecture.ts",
    fix: "Replace the flat peak ellipse with an upward-pointing cone glow (radialGradient anchored to apex, zero opacity at r=0).",
    detect: m => {
      // Flag only flat lava caps (ry < rx = wide saucer). Fixed glow has ry > rx (tall column).
      const matches = [...m.svg.matchAll(/<ellipse[^>]*fill="url\(#[^"]*lava\)"[^>]*\/>/g)];
      return matches.some(([el]) => {
        const rx = parseFloat(el.match(/rx="(\d+\.?\d*)"/)?.[1] ?? "0");
        const ry = parseFloat(el.match(/ry="(\d+\.?\d*)"/)?.[1] ?? "0");
        return ry < rx;
      });
    },
  },
  {
    id: "CITYSCAPE_NOISE",
    label: "Cityscape rect noise (no context)",
    severity: "critical",
    description:
      "cityscapeBrick emits hundreds of <rect> building/window elements. Without a sky gradient or fog anchor the rects read as random grey noise squares.",
    brick: "cityscapeBrick",
    sourceFile: "src/wallpaper/bricks/architecture.ts",
    fix: "Add sky gradient + fog layers in Void/Monochromatic graphiteFlux scenes. Reduce window density when scene depth < 3 layers.",
    detect: m => m.rectCount > 500,
  },
  {
    id: "NO_SCENE_COMPLEXITY",
    label: "No hard scene shapes",
    severity: "minor",
    description:
      "Fewer than 3 <path> elements and fewer than 10 circles/ellipses in a file under 12 KB. The scene consists entirely of gradient rects with no terrain, aurora, or hard-edged silhouettes.",
    brick: "(motif-level)",
    sourceFile: "src/wallpaper/motifs/",
    fix: "Add a terrainStackBrick or nebulaGlowBrick layer. Even one terrain contour path lifts the scene from 'gradient' to 'landscape'.",
    // Exclude rect-heavy scenes (cityscapeBrick buildings count as content)
    detect: m => m.pathCount <= 2 && m.circleCount < 10 && m.fileSizeKB < 12 && m.rectCount < 20,
  },
];

// ── Scanner ───────────────────────────────────────────────────────────────────

interface SvgReport {
  seed: string;
  mode: string;
  file: string;
  fileSizeKB: number;
  idCount: number;
  rectCount: number;
  pathCount: number;
  circleCount: number;
  blurCount: number;
  auroraCount: number;
  bugs: string[];
}

function analyzeSvg(filePath: string, seed: string, mode: string): SvgReport {
  const svg = fs.readFileSync(filePath, "utf8");
  const ids = (svg.match(/id="([^"]+)"/g) ?? []).map(m => m.slice(4, -1));
  const rectCount = (svg.match(/<rect/g) ?? []).length;
  const pathCount = (svg.match(/<path/g) ?? []).length;
  const circleCount = (svg.match(/<circle|<ellipse/g) ?? []).length;
  const blurCount = (svg.match(/<feGaussianBlur/g) ?? []).length;
  const auroraCount = ids.filter(id => /-au-g\d/.test(id)).length;
  const fileSizeKB = Math.round(fs.statSync(filePath).size / 1024);

  const metrics: SvgMetrics = {
    svg,
    ids,
    rectCount,
    pathCount,
    circleCount,
    blurCount,
    auroraCount,
    fileSizeKB,
  };

  const bugs = BUGS.filter(b => b.detect(metrics)).map(b => b.id);

  return {
    seed,
    mode,
    file: path.relative(ROOT, filePath),
    fileSizeKB,
    idCount: ids.length,
    rectCount,
    pathCount,
    circleCount,
    blurCount,
    auroraCount,
    bugs,
  };
}

function run(): void {
  const reports: SvgReport[] = [];

  const seeds = fs
    .readdirSync(WALLPAPERS_DIR)
    .filter(s => fs.statSync(path.join(WALLPAPERS_DIR, s)).isDirectory());

  for (const seed of seeds.sort()) {
    const seedDir = path.join(WALLPAPERS_DIR, seed);
    const modes = fs
      .readdirSync(seedDir)
      .filter(m => fs.statSync(path.join(seedDir, m)).isDirectory());

    for (const mode of modes.sort()) {
      const svgPath = path.join(seedDir, mode, "monitor.svg");
      if (!fs.existsSync(svgPath)) continue;
      reports.push(analyzeSvg(svgPath, seed, mode));
    }
  }

  // Sort: bugs first (by severity), then clean
  reports.sort((a, b) => {
    const sev = (r: SvgReport) => {
      if (r.bugs.some(id => BUGS.find(d => d.id === id)?.severity === "critical")) return 0;
      if (r.bugs.some(id => BUGS.find(d => d.id === id)?.severity === "moderate")) return 1;
      if (r.bugs.length > 0) return 2;
      return 3;
    };
    return sev(a) - sev(b);
  });

  const bugCounts: Record<string, number> = {};
  for (const r of reports) {
    for (const b of r.bugs) bugCounts[b] = (bugCounts[b] ?? 0) + 1;
  }

  const manifest: BugManifest = { bugCounts };

  const fullManifest = {
    generatedAt: new Date().toISOString(),
    totalScanned: reports.length,
    totalWithBugs: reports.filter(r => r.bugs.length > 0).length,
    bugCounts,
    reports,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(fullManifest, null, 2));
  console.log(`✓ Wrote ${OUT_JSON}`);

  fs.writeFileSync(OUT_HTML, buildHtml(reports, manifest));
  console.log(`✓ Wrote ${OUT_HTML}`);

  console.log(`\nScanned ${reports.length} SVGs — ${fullManifest.totalWithBugs} have bugs\n`);
  for (const [bugId, count] of Object.entries(bugCounts).sort((a, b) => b[1] - a[1])) {
    const def = BUGS.find(b => b.id === bugId);
    if (!def) continue;
    const bar = "█".repeat(count);
    console.log(`  ${severityEmoji(def.severity)} ${bugId.padEnd(30)} ${bar} (${count})`);
  }
}

function severityEmoji(s: Severity): string {
  return s === "critical" ? "🔴" : s === "moderate" ? "🟡" : "🟢";
}

// ── HTML builder ──────────────────────────────────────────────────────────────

interface BugManifest {
  bugCounts: Record<string, number>;
}

function buildHtml(reports: SvgReport[], manifest: BugManifest): string {
  const severityColor: Record<Severity, string> = {
    critical: "#e05252",
    moderate: "#d4a04a",
    minor: "#5a9e6e",
  };

  const bugDefsHtml = BUGS.map(b => {
    const count = manifest.bugCounts[b.id] ?? 0;
    return `
    <tr>
      <td><span class="badge" style="background:${severityColor[b.severity]}">${b.id}</span></td>
      <td>${b.label}</td>
      <td class="sev-${b.severity}">${b.severity}</td>
      <td>${count}</td>
      <td><code>${b.brick}</code></td>
      <td><code>${b.sourceFile}${b.sourceLine ? `:${b.sourceLine}` : ""}</code></td>
      <td>${b.fix}</td>
    </tr>`;
  }).join("\n");

  const cardsHtml = reports
    .map(r => {
      const svgContent = fs.readFileSync(path.join(ROOT, r.file), "utf8");
      const bugBadges = r.bugs
        .map(id => {
          const def = BUGS.find(b => b.id === id);
          if (!def) return "";
          return `<span class="badge" style="background:${severityColor[def.severity]}" title="${def.description}">${id}</span>`;
        })
        .join(" ");

      const topSev = r.bugs.find(b => BUGS.find(d => d.id === b)?.severity === "critical")
        ? "critical"
        : r.bugs.find(b => BUGS.find(d => d.id === b)?.severity === "moderate")
          ? "moderate"
          : r.bugs.length > 0
            ? "minor"
            : null;

      const borderColor = topSev ? severityColor[topSev] : "#2a2a3a";

      return `
    <div class="card" style="border-color:${borderColor}">
      <div class="thumb">${svgContent}</div>
      <div class="meta">
        <div class="title">${r.seed} / ${r.mode}</div>
        <div class="stats">${r.fileSizeKB} KB · ${r.idCount} ids · ${r.blurCount} blur · path=${r.pathCount} circ=${r.circleCount}</div>
        <div class="bugs">${bugBadges || '<span class="ok">✓ clean</span>'}</div>
      </div>
    </div>`;
    })
    .join("\n");

  const withBugs = reports.filter(r => r.bugs.length > 0).length;
  const critCount = reports.filter(r =>
    r.bugs.some(b => BUGS.find(d => d.id === b)?.severity === "critical")
  ).length;
  const modCount = reports.filter(
    r =>
      r.bugs.some(b => BUGS.find(d => d.id === b)?.severity === "moderate") &&
      !r.bugs.some(b => BUGS.find(d => d.id === b)?.severity === "critical")
  ).length;
  const cleanCount = reports.filter(r => r.bugs.length === 0).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Wallpaper Bug Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0e0e18; color: #c8c8d8; font: 13px/1.5 "JetBrains Mono", "Fira Code", monospace; }
  header { padding: 24px 32px 16px; border-bottom: 1px solid #1e1e2e; }
  header h1 { font-size: 20px; color: #e8e8f8; }
  header p { color: #6c6c8c; font-size: 11px; margin-top: 4px; }
  .summary { display: flex; gap: 24px; padding: 16px 32px; background: #12121e; border-bottom: 1px solid #1e1e2e; flex-wrap: wrap; align-items: center; }
  .stat { text-align: center; }
  .stat .val { font-size: 28px; font-weight: 700; color: #e8e8f8; }
  .stat .lbl { font-size: 10px; color: #6c6c8c; text-transform: uppercase; letter-spacing: 0.08em; }
  .divider { width: 1px; height: 40px; background: #2a2a3a; }

  section { padding: 24px 32px; }
  section h2 { font-size: 14px; color: #a0a0c0; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; padding: 6px 10px; background: #1a1a2e; color: #6c6c8c; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  td { padding: 6px 10px; border-bottom: 1px solid #1a1a2e; vertical-align: top; }
  td code { color: #7ec8a8; font-size: 10px; }
  .sev-critical { color: #e05252; }
  .sev-moderate { color: #d4a04a; }
  .sev-minor { color: #5a9e6e; }

  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 0 32px 40px; }
  .card { border: 1px solid #2a2a3a; border-radius: 6px; overflow: hidden; background: #12121e; }
  .thumb { aspect-ratio: 16/10; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #0a0a14; }
  .thumb svg { width: 100%; height: 100%; display: block; }
  .meta { padding: 10px 12px; }
  .title { font-size: 12px; color: #d0d0e8; font-weight: 600; margin-bottom: 4px; }
  .stats { font-size: 10px; color: #4c4c6c; margin-bottom: 6px; }
  .bugs { display: flex; flex-wrap: wrap; gap: 4px; }
  .ok { color: #5a9e6e; font-size: 10px; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; color: #fff; white-space: nowrap; cursor: default; }
</style>
</head>
<body>
<header>
  <h1>Wallpaper SVG Bug Report</h1>
  <p>Generated ${new Date().toISOString()} · ${reports.length} monitor.svg files scanned · gallery sorted by severity</p>
</header>

<div class="summary">
  <div class="stat"><div class="val">${reports.length}</div><div class="lbl">Scanned</div></div>
  <div class="divider"></div>
  <div class="stat"><div class="val" style="color:#e05252">${critCount}</div><div class="lbl">Critical</div></div>
  <div class="stat"><div class="val" style="color:#d4a04a">${modCount}</div><div class="lbl">Moderate</div></div>
  <div class="stat"><div class="val" style="color:#5a9e6e">${cleanCount}</div><div class="lbl">Clean</div></div>
  <div class="divider"></div>
  ${BUGS.map(b => `<div class="stat"><div class="val" style="color:${severityColor[b.severity]}">${manifest.bugCounts[b.id] ?? 0}</div><div class="lbl" style="font-size:9px">${b.id.replace(/_/g, " ")}</div></div>`).join("\n  ")}
</div>

<section>
  <h2>Bug Definitions &amp; Source Mapping</h2>
  <table>
    <thead>
      <tr><th>Bug ID</th><th>Label</th><th>Sev</th><th>#</th><th>Brick</th><th>Source</th><th>Fix</th></tr>
    </thead>
    <tbody>
      ${bugDefsHtml}
    </tbody>
  </table>
</section>

<section>
  <h2>Gallery — ${withBugs} with bugs · ${cleanCount} clean</h2>
</section>
<div class="gallery">
  ${cardsHtml}
</div>
</body>
</html>`;
}

run();
