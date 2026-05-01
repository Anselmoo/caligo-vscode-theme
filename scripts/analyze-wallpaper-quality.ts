/**
 * analyze-wallpaper-quality.ts
 *
 * Multi-dimension quality analysis for all 50 monitor-platform SVGs.
 * Scores each SVG across complexity, depth, diversity, and atmosphere.
 * Emits:
 *   public/quality-report.json   — structured data
 *   public/quality-report.html   — sortable HTML dashboard
 *
 * Run:
 *   npx tsx scripts/analyze-wallpaper-quality.ts
 *   npx tsx scripts/analyze-wallpaper-quality.ts --motif NebulaNight
 *   npx tsx scripts/analyze-wallpaper-quality.ts --json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WALLPAPERS_DIR = path.join(ROOT, "public", "wallpapers");
const OUT_JSON = path.join(ROOT, "public", "quality-report.json");
const OUT_HTML = path.join(ROOT, "public", "quality-report.html");

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const motifFilter = (() => {
  const i = args.indexOf("--motif");
  return i >= 0 ? args[i + 1]?.toLowerCase() : null;
})();

// ── Brick detection patterns (match against element IDs) ──────────────────────

interface BrickCategory {
  name: string;
  pattern: RegExp;
  layer: "sky" | "mid" | "ground" | "effect";
}

const BRICK_CATEGORIES: BrickCategory[] = [
  { name: "starField", pattern: /-st(-|$)/, layer: "sky" },
  { name: "aurora", pattern: /-au(-|$)/, layer: "sky" },
  { name: "skyGradient", pattern: /-sky(-|$)/, layer: "sky" },
  { name: "nebula", pattern: /-(ng|eg|bs)(-|$)/, layer: "sky" },
  { name: "moon", pattern: /-(mn|pl)(-|$)/, layer: "sky" },
  { name: "rays", pattern: /-(ry)(-|$)/, layer: "sky" },
  { name: "terrain", pattern: /-(mtn|tc|rd|cr)(-|$)/, layer: "mid" },
  { name: "dunes", pattern: /-(d1|d2|d3|dn)(-|$)/, layer: "mid" },
  { name: "cityscape", pattern: /-(bld|skyline)(-|$)/, layer: "mid" },
  { name: "horizonGlow", pattern: /-(hg|fg)(-|$)/, layer: "mid" },
  { name: "treeline", pattern: /-tl(-|$)/, layer: "ground" },
  { name: "water", pattern: /-(ripple|wv)(-|$)/, layer: "ground" },
  { name: "particles", pattern: /-(sp|em|dust|pt)(-|$)/, layer: "effect" },
  { name: "atmosphere", pattern: /-(atmo|atm|mist|hz)(-|$)/, layer: "effect" },
  { name: "ring", pattern: /-(rg|mh)(-|$)/, layer: "effect" },
  { name: "shootingStar", pattern: /-(mt|trail)(-|$)/, layer: "effect" },
  { name: "brushStroke", pattern: /-bsa|-bsb/, layer: "effect" },
  { name: "toneCurve", pattern: /-tone(-|$)/, layer: "effect" },
];

// ── Quality issue definitions ──────────────────────────────────────────────────

type IssueSeverity = "critical" | "moderate" | "minor";

interface QualityIssue {
  id: string;
  label: string;
  severity: IssueSeverity;
  description: string;
  fix: string;
}

const QUALITY_ISSUES: QualityIssue[] = [
  {
    id: "SPARSE_VOID",
    label: "Visually empty scene",
    severity: "critical",
    description: "< 3 paths and < 20 circles in a small file — scene has no visible structure.",
    fix: "Add terrain contour, star field, or nebula glow. Minimum 3 visible brick layers.",
  },
  {
    id: "MISSING_GROUND",
    label: "No ground reference layer",
    severity: "moderate",
    description: "Scene lacks any terrain, dune, treeline, or cityscape element — floats in void.",
    fix: "Add terrainContourBrick, duneBrick, treelineBrick, or cityscapeBrick to anchor the scene.",
  },
  {
    id: "MISSING_SKY_SUBJECT",
    label: "Empty sky — no focal element",
    severity: "moderate",
    description: "No star field, moon, aurora, nebula, or celestial body in the sky region.",
    fix: "Add starFieldBrick (≥40 stars) + at least one focal element (moon, aurora, nebula glow).",
  },
  {
    id: "GLOW_BLOB_ONLY",
    label: "Scene is purely gradient blobs",
    severity: "moderate",
    description:
      "0 paths and many circles — scene consists entirely of soft gradient ellipses with no hard shapes.",
    fix: "Add at least one path-based element: terrain, treeline, or aurora band.",
  },
  {
    id: "LOW_DIVERSITY",
    label: "Low element diversity (≤ 2 brick types)",
    severity: "minor",
    description: "Fewer than 3 distinct brick categories detected — scene lacks visual richness.",
    fix: "Add atmospheric haze, particles, or a second focal element to increase depth.",
  },
  {
    id: "STAR_POOR",
    label: "Star-poor night scene",
    severity: "minor",
    description: "Night scene (has sky gradient) but estimated star count < 30.",
    fix: "Increase starFieldBrick count to ≥ 50, add brightCount ≥ 5 for visible sparkle.",
  },
  {
    id: "OVERSIZE",
    label: "Oversized SVG file",
    severity: "critical",
    description: "> 150 KB — likely element explosion (rect/circle density bug).",
    fix: "Check cityscapeBrick window density, starFieldBrick count. Reduce to < 80 KB.",
  },
];

// ── Analysis types ─────────────────────────────────────────────────────────────

interface QualityScore {
  complexity: number; // 0–100: total element density relative to target
  depth: number; // 0–100: sky / mid / ground layer presence
  diversity: number; // 0–100: distinct brick category breadth
  atmosphere: number; // 0–100: atmospheric/effect layer richness
  overall: number; // 0–100: weighted composite
  grade: "A" | "B" | "C" | "D" | "F";
}

interface SVGReport {
  motif: string;
  mode: string;
  file: string;
  fileSizeKB: number;
  elements: {
    paths: number;
    circles: number;
    rects: number;
    ellipses: number;
    total: number;
  };
  counts: {
    gradients: number;
    filters: number;
    ids: number;
  };
  bricksDetected: string[];
  layers: {
    hasSky: boolean;
    hasMid: boolean;
    hasGround: boolean;
  };
  issues: string[];
  scores: QualityScore;
}

// ── SVG analyzer ──────────────────────────────────────────────────────────────

function analyzeOne(filePath: string, motif: string, mode: string): SVGReport {
  const svg = fs.readFileSync(filePath, "utf8");
  const fileSizeKB = Math.round(fs.statSync(filePath).size / 1024);

  // Element counts
  const paths = (svg.match(/<path/g) ?? []).length;
  const circles = (svg.match(/<circle/g) ?? []).length;
  const rects = (svg.match(/<rect/g) ?? []).length;
  const ellipses = (svg.match(/<ellipse/g) ?? []).length;
  const total = paths + circles + rects + ellipses;

  const gradients = (svg.match(/<(?:linear|radial)Gradient/g) ?? []).length;
  const filters = (svg.match(/<feGaussianBlur/g) ?? []).length;
  const ids = (svg.match(/\sid="[^"]+"/g) ?? []).map(m =>
    m.replace(/^\s*id="/, "").replace(/"$/, "")
  );

  // Brick detection
  const bricksDetected = BRICK_CATEGORIES.filter(bc => ids.some(id => bc.pattern.test(id))).map(
    bc => bc.name
  );

  const hasSky = bricksDetected.some(b =>
    ["skyGradient", "starField", "aurora", "nebula", "moon"].includes(b)
  );
  const hasMid = bricksDetected.some(b =>
    ["terrain", "dunes", "cityscape", "horizonGlow"].includes(b)
  );
  const hasGround = bricksDetected.some(b => ["treeline", "water", "dunes", "terrain"].includes(b));

  // Issue detection
  const issues: string[] = [];

  if (fileSizeKB > 150) issues.push("OVERSIZE");
  if (paths < 3 && circles < 20 && fileSizeKB < 20) issues.push("SPARSE_VOID");
  if (!hasMid && !hasGround) issues.push("MISSING_GROUND");
  if (!hasSky) issues.push("MISSING_SKY_SUBJECT");
  if (paths === 0 && circles > 5) issues.push("GLOW_BLOB_ONLY");
  if (bricksDetected.length <= 2) issues.push("LOW_DIVERSITY");
  if (hasSky && circles < 30 && !bricksDetected.includes("aurora")) issues.push("STAR_POOR");

  // Quality scoring
  const complexityRaw = Math.min(paths * 5 + circles * 0.8 + fileSizeKB * 1.2, 120);
  const complexity = Math.min(100, Math.round(complexityRaw));

  const layerCount = (hasSky ? 1 : 0) + (hasMid ? 1 : 0) + (hasGround ? 1 : 0);
  const depth = Math.round((layerCount / 3) * 100);

  const skyBricks = BRICK_CATEGORIES.filter(bc => bc.layer === "sky").map(bc => bc.name);
  const midBricks = BRICK_CATEGORIES.filter(bc => bc.layer === "mid").map(bc => bc.name);
  const groundBricks = BRICK_CATEGORIES.filter(bc => bc.layer === "ground").map(bc => bc.name);
  const effectBricks = BRICK_CATEGORIES.filter(bc => bc.layer === "effect").map(bc => bc.name);

  const _skyCount = bricksDetected.filter(b => skyBricks.includes(b)).length;
  const _midCount = bricksDetected.filter(b => midBricks.includes(b)).length;
  const _groundCount = bricksDetected.filter(b => groundBricks.includes(b)).length;
  const effectCount = bricksDetected.filter(b => effectBricks.includes(b)).length;

  const diversity = Math.min(100, Math.round((bricksDetected.length / 7) * 100));
  const atmosphere = Math.min(
    100,
    Math.round((effectCount / 4 + filters / 8 + gradients / 12) * 40)
  );

  const overall = Math.round(complexity * 0.3 + depth * 0.3 + diversity * 0.25 + atmosphere * 0.15);

  const grade: QualityScore["grade"] =
    overall >= 80 ? "A" : overall >= 65 ? "B" : overall >= 50 ? "C" : overall >= 35 ? "D" : "F";

  return {
    motif,
    mode,
    file: path.relative(ROOT, filePath),
    fileSizeKB,
    elements: { paths, circles, rects, ellipses, total },
    counts: { gradients, filters, ids: ids.length },
    bricksDetected,
    layers: { hasSky, hasMid, hasGround },
    issues,
    scores: { complexity, depth, diversity, atmosphere, overall, grade },
  };
}

// ── Console reporter ──────────────────────────────────────────────────────────

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

function gradeColor(g: string): string {
  return g === "A" ? ANSI.green : g === "B" ? ANSI.cyan : g === "F" ? ANSI.red : ANSI.yellow;
}

function _bar(score: number, width = 12): string {
  const filled = Math.round((score / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function printConsole(reports: SVGReport[]): void {
  const sorted = [...reports].sort((a, b) => a.scores.overall - b.scores.overall);

  console.log(
    `\n${ANSI.bold}Caligo Wallpaper Quality Analysis${ANSI.reset} · ${reports.length} SVGs\n`
  );

  const header = [
    "Motif/Mode".padEnd(38),
    "Ovrl".padEnd(5),
    "Cmpl".padEnd(5),
    "Dpth".padEnd(5),
    "Divr".padEnd(5),
    "Atmo".padEnd(5),
    "Gr".padEnd(3),
    "KB".padEnd(5),
    "Bricks".padEnd(0),
  ].join("  ");

  console.log(`${ANSI.dim}${header}${ANSI.reset}`);
  console.log("─".repeat(100));

  for (const r of sorted) {
    const label = `${r.motif}/${r.mode}`.padEnd(38);
    const { overall, complexity, depth, diversity, atmosphere, grade } = r.scores;
    const gc = gradeColor(grade);
    const issueStr = r.issues.length > 0 ? ` ${ANSI.red}⚠ ${r.issues.join(" ")}${ANSI.reset}` : "";

    console.log(
      `${ANSI.white}${label}${ANSI.reset}` +
        `  ${gc}${String(overall).padEnd(5)}${ANSI.reset}` +
        `  ${String(complexity).padEnd(5)}` +
        `  ${String(depth).padEnd(5)}` +
        `  ${String(diversity).padEnd(5)}` +
        `  ${String(atmosphere).padEnd(5)}` +
        `  ${gc}${grade}${ANSI.reset}  ` +
        `${String(r.fileSizeKB).padEnd(5)}` +
        `  ${ANSI.gray}${r.bricksDetected.join(", ")}${ANSI.reset}` +
        issueStr
    );
  }

  // Summary
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const r of reports) grades[r.scores.grade]++;

  const issueCounts: Record<string, number> = {};
  for (const r of reports) {
    for (const i of r.issues) issueCounts[i] = (issueCounts[i] ?? 0) + 1;
  }

  console.log("\n─".padEnd(101, "─"));
  console.log(`\n${ANSI.bold}Grade distribution:${ANSI.reset}`);
  for (const [g, n] of Object.entries(grades)) {
    const gc = gradeColor(g);
    console.log(`  ${gc}${g}${ANSI.reset}  ${"█".repeat(n).padEnd(50)} ${n}`);
  }

  if (Object.keys(issueCounts).length > 0) {
    console.log(`\n${ANSI.bold}Issues found:${ANSI.reset}`);
    for (const [issue, count] of Object.entries(issueCounts).sort((a, b) => b[1] - a[1])) {
      const def = QUALITY_ISSUES.find(q => q.id === issue);
      const color =
        def?.severity === "critical"
          ? ANSI.red
          : def?.severity === "moderate"
            ? ANSI.yellow
            : ANSI.gray;
      console.log(`  ${color}${issue.padEnd(24)}${ANSI.reset} ${"█".repeat(count)} (${count})`);
    }
  }

  console.log(
    `\nAvg overall: ${Math.round(reports.reduce((s, r) => s + r.scores.overall, 0) / reports.length)}/100\n`
  );
}

// ── HTML report ───────────────────────────────────────────────────────────────

function buildHtml(reports: SVGReport[]): string {
  const sorted = [...reports].sort((a, b) => a.scores.overall - b.scores.overall);

  const severityColor: Record<IssueSeverity, string> = {
    critical: "#e05252",
    moderate: "#d4a04a",
    minor: "#7a9e6e",
  };

  const gradeCol: Record<string, string> = {
    A: "#5a9e6e",
    B: "#4a8ab4",
    C: "#d4a04a",
    D: "#d48044",
    F: "#e05252",
  };

  function scoreBar(score: number, color = "#4a8ab4"): string {
    return `<div style="display:flex;align-items:center;gap:6px">
      <div style="flex:1;height:4px;background:#1a1a2e;border-radius:2px">
        <div style="width:${score}%;height:100%;background:${color};border-radius:2px"></div>
      </div>
      <span style="font-size:10px;color:#9090b0;width:28px;text-align:right">${score}</span>
    </div>`;
  }

  const issueDefs = QUALITY_ISSUES.map(
    q => `
    <tr>
      <td><span class="badge" style="background:${severityColor[q.severity]}">${q.id}</span></td>
      <td>${q.label}</td>
      <td class="sev-${q.severity}">${q.severity}</td>
      <td>${q.description}</td>
      <td>${q.fix}</td>
    </tr>`
  ).join("\n");

  const cards = sorted
    .map(r => {
      const svgContent = fs.readFileSync(path.join(ROOT, r.file), "utf8");
      const gc = gradeCol[r.scores.grade] ?? "#888";
      const issueBadges = r.issues
        .map(id => {
          const def = QUALITY_ISSUES.find(q => q.id === id);
          const col = def ? severityColor[def.severity] : "#666";
          return `<span class="badge" style="background:${col}" title="${def?.description ?? ""}">${id}</span>`;
        })
        .join(" ");

      return `
  <div class="card" style="border-color:${r.issues.some(i => QUALITY_ISSUES.find(q => q.id === i)?.severity === "critical") ? "#e05252" : r.issues.length > 0 ? "#d4a04a" : "#2a2a3a"}">
    <div class="thumb">${svgContent}</div>
    <div class="meta">
      <div class="title-row">
        <span class="title">${r.motif} / ${r.mode}</span>
        <span class="grade" style="color:${gc}">${r.scores.grade}</span>
      </div>
      <div class="stats">${r.fileSizeKB} KB · ${r.elements.total} elements · ${r.bricksDetected.length} brick types</div>
      <div class="score-grid">
        <div class="score-label">Overall</div>${scoreBar(r.scores.overall, gc)}
        <div class="score-label">Complexity</div>${scoreBar(r.scores.complexity, "#5a7a9e")}
        <div class="score-label">Depth</div>${scoreBar(r.scores.depth, "#5a9e7a")}
        <div class="score-label">Diversity</div>${scoreBar(r.scores.diversity, "#9e5a9e")}
        <div class="score-label">Atmosphere</div>${scoreBar(r.scores.atmosphere, "#9e7a5a")}
      </div>
      <div class="bricks">${r.bricksDetected.map(b => `<span class="brick-tag">${b}</span>`).join(" ")}</div>
      <div class="issues">${issueBadges || '<span class="ok">✓ no issues</span>'}</div>
    </div>
  </div>`;
    })
    .join("\n");

  const avgOverall = Math.round(reports.reduce((s, r) => s + r.scores.overall, 0) / reports.length);
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<string, number>;
  for (const r of reports) grades[r.scores.grade]++;
  const issueCounts: Record<string, number> = {};
  for (const r of reports) for (const i of r.issues) issueCounts[i] = (issueCounts[i] ?? 0) + 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Wallpaper Quality Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0e0e18; color: #c8c8d8; font: 12px/1.5 "JetBrains Mono","Fira Code",monospace; }
  header { padding: 24px 32px 16px; border-bottom: 1px solid #1e1e2e; }
  header h1 { font-size: 20px; color: #e8e8f8; }
  header p { color: #6c6c8c; font-size: 11px; margin-top: 4px; }
  .summary { display: flex; gap: 24px; padding: 16px 32px; background: #12121e; border-bottom: 1px solid #1e1e2e; flex-wrap: wrap; align-items: center; }
  .stat { text-align: center; }
  .stat .val { font-size: 26px; font-weight: 700; }
  .stat .lbl { font-size: 10px; color: #6c6c8c; text-transform: uppercase; letter-spacing: 0.08em; }
  .divider { width: 1px; height: 40px; background: #2a2a3a; }
  section { padding: 20px 32px; }
  section h2 { font-size: 13px; color: #a0a0c0; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; padding: 6px 10px; background: #1a1a2e; color: #6c6c8c; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  td { padding: 6px 10px; border-bottom: 1px solid #1a1a2e; vertical-align: top; }
  .sev-critical { color: #e05252; } .sev-moderate { color: #d4a04a; } .sev-minor { color: #7a9e6e; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; padding: 0 32px 40px; }
  .card { border: 1px solid #2a2a3a; border-radius: 6px; overflow: hidden; background: #12121e; }
  .thumb { aspect-ratio: 16/10; overflow: hidden; background: #0a0a14; }
  .thumb svg { width: 100%; height: 100%; display: block; }
  .meta { padding: 10px 12px; }
  .title-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
  .title { font-size: 11px; color: #d0d0e8; font-weight: 700; }
  .grade { font-size: 22px; font-weight: 700; }
  .stats { font-size: 10px; color: #4c4c6c; margin-bottom: 8px; }
  .score-grid { display: grid; grid-template-columns: 80px 1fr; gap: 3px 8px; margin-bottom: 8px; align-items: center; }
  .score-label { font-size: 10px; color: #6c6c8c; }
  .bricks { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 6px; }
  .brick-tag { background: #1a1a2e; border: 1px solid #2a2a3a; padding: 1px 5px; border-radius: 3px; font-size: 9px; color: #7080a0; }
  .issues { display: flex; flex-wrap: wrap; gap: 3px; }
  .ok { color: #5a9e6e; font-size: 10px; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; color: #fff; cursor: default; }
  .controls { padding: 12px 32px; background: #12121e; border-bottom: 1px solid #1e1e2e; display: flex; gap: 12px; flex-wrap: wrap; }
  .controls button { background: #1e1e2e; border: 1px solid #2a2a3a; color: #a0a0c0; padding: 5px 12px; border-radius: 4px; font: 11px monospace; cursor: pointer; }
  .controls button:hover { background: #2a2a3a; color: #e0e0f0; }
  .controls button.active { background: #2a2a4a; border-color: #4a4a8a; color: #c0c0f0; }
</style>
</head>
<body>
<header>
  <h1>Wallpaper Quality Report</h1>
  <p>Generated ${new Date().toISOString()} · ${reports.length} SVGs · avg overall score ${avgOverall}/100</p>
</header>

<div class="summary">
  <div class="stat"><div class="val">${reports.length}</div><div class="lbl">Total</div></div>
  <div class="divider"></div>
  ${Object.entries(grades)
    .map(
      ([g, n]) =>
        `<div class="stat"><div class="val" style="color:${gradeCol[g]}">${n}</div><div class="lbl">Grade ${g}</div></div>`
    )
    .join("\n  ")}
  <div class="divider"></div>
  <div class="stat"><div class="val">${avgOverall}</div><div class="lbl">Avg Score</div></div>
  <div class="divider"></div>
  ${Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => {
      const def = QUALITY_ISSUES.find(q => q.id === id);
      const col = def ? severityColor[def.severity] : "#888";
      return `<div class="stat"><div class="val" style="color:${col}">${n}</div><div class="lbl" style="font-size:9px">${id.replace(/_/g, " ")}</div></div>`;
    })
    .join("\n  ")}
</div>

<div class="controls">
  <span style="color:#6c6c8c;font-size:11px;align-self:center">Sort by:</span>
  <button onclick="sortCards('overall')" class="active">Overall ↑</button>
  <button onclick="sortCards('complexity')">Complexity</button>
  <button onclick="sortCards('depth')">Depth</button>
  <button onclick="sortCards('diversity')">Diversity</button>
  <button onclick="sortCards('issues')">Issues first</button>
  <button onclick="sortCards('kb')">File size</button>
</div>

<section>
  <h2>Issue Definitions</h2>
  <table>
    <thead><tr><th>Issue ID</th><th>Label</th><th>Severity</th><th>Description</th><th>Fix</th></tr></thead>
    <tbody>${issueDefs}</tbody>
  </table>
</section>

<section style="padding-bottom:8px"><h2>Gallery — sorted by overall score (worst first)</h2></section>
<div class="gallery" id="gallery">
${cards}
</div>

<script>
const data = ${JSON.stringify(
    sorted.map(r => ({
      motif: r.motif,
      mode: r.mode,
      issues: r.issues,
      scores: r.scores,
      fileSizeKB: r.fileSizeKB,
    }))
  )};

function sortCards(by) {
  const gallery = document.getElementById('gallery');
  const cards = [...gallery.children];
  document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  cards.sort((a, b) => {
    const ai = cards.indexOf(a), bi = cards.indexOf(b);
    const ad = data[ai], bd = data[bi];
    if (by === 'issues') return bd.issues.length - ad.issues.length;
    if (by === 'kb') return bd.fileSizeKB - ad.fileSizeKB;
    return (ad.scores[by] ?? 0) - (bd.scores[by] ?? 0);
  });
  cards.forEach(c => gallery.appendChild(c));
}
</script>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

function run(): void {
  const reports: SVGReport[] = [];

  const motifs = fs
    .readdirSync(WALLPAPERS_DIR)
    .filter(
      m =>
        fs.statSync(path.join(WALLPAPERS_DIR, m)).isDirectory() &&
        (!motifFilter || m.toLowerCase() === motifFilter)
    );

  for (const motif of motifs.sort()) {
    const motifDir = path.join(WALLPAPERS_DIR, motif);
    const modes = fs
      .readdirSync(motifDir)
      .filter(m => fs.statSync(path.join(motifDir, m)).isDirectory());

    for (const mode of modes.sort()) {
      const svgPath = path.join(motifDir, mode, "monitor.svg");
      if (!fs.existsSync(svgPath)) continue;
      reports.push(analyzeOne(svgPath, motif, mode));
    }
  }

  if (jsonOnly) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
    return;
  }

  printConsole(reports);

  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2)
  );
  console.log(`✓ ${OUT_JSON}`);

  fs.writeFileSync(OUT_HTML, buildHtml(reports));
  console.log(`✓ ${OUT_HTML}`);
}

run();
