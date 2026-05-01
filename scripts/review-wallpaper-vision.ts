/**
 * review-wallpaper-vision.ts
 *
 * AI vision reviewer for wallpaper SVGs.
 * Uses Playwright to render each SVG to a PNG screenshot,
 * then sends it to Claude claude-haiku-4-5-20251001 for a structured realism critique
 * against the gold-standard night-sky reference photo.
 *
 * Requirements:
 *   ANTHROPIC_API_KEY env var must be set
 *   npx playwright install chromium  (first run only)
 *
 * Run:
 *   npx tsx scripts/review-wallpaper-vision.ts
 *   npx tsx scripts/review-wallpaper-vision.ts --motif AuroraNoir
 *   npx tsx scripts/review-wallpaper-vision.ts --limit 10
 *   npx tsx scripts/review-wallpaper-vision.ts --concurrency 3
 *
 * Emits:
 *   public/vision-report.json
 *   public/vision-report.html
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WALLPAPERS_DIR = path.join(ROOT, "public", "wallpapers");
const OUT_JSON = path.join(ROOT, "public", "vision-report.json");
const OUT_HTML = path.join(ROOT, "public", "vision-report.html");

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const motifFilter = (() => {
  const i = args.indexOf("--motif");
  return i >= 0 ? args[i + 1]?.toLowerCase() : null;
})();
const limitArg = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? parseInt(args[i + 1] ?? "50", 10) : 50;
})();
const concurrency = (() => {
  const i = args.indexOf("--concurrency");
  return i >= 0 ? parseInt(args[i + 1] ?? "2", 10) : 2;
})();

// ── Anthropic API ─────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
  process.exit(1);
}

interface VisionScore {
  naturalAppearance: number; // 1–10: does it look natural vs. geometric/synthetic?
  depthPerception: number; // 1–10: multiple believable depth layers?
  atmosphericQuality: number; // 1–10: realistic atmospheric effects?
  celestialAccuracy: number; // 1–10: realistic stars/moon/celestial bodies?
  terrainNaturalism: number; // 1–10: organic terrain vs. flat shapes?
  overallRealism: number; // 1–10: vs. a real photograph
}

interface VisionResult {
  scores: VisionScore;
  issues: string[]; // specific visual problems found
  strengths: string[]; // what works well
  summary: string; // one-sentence critique
  rawResponse?: string;
}

const REVIEW_PROMPT = `You are a professional art director reviewing wallpaper SVG illustrations for visual realism.

You will compare the provided wallpaper screenshot against the qualities of a gold-standard night-sky reference photo that shows:
- A dense star field (400+ stars) with natural magnitude variation (a few bright stars, many dim ones)
- A visible Milky Way band with soft galaxy-core nebulosity
- A crescent moon positioned in the upper third, off-center
- 3–4 layered terrain ridges receding to horizon with atmospheric blue perspective
- An organic treeline silhouette with individual tree peaks
- A deep atmospheric blue glow along the horizon

Evaluate the wallpaper on these 6 dimensions (score 1–10 each, 10 = indistinguishable from a real photo):
1. naturalAppearance — does it look natural or obviously synthetic/geometric?
2. depthPerception — are there multiple believable depth layers (sky/mid/foreground)?
3. atmosphericQuality — realistic atmospheric haze, glow, and scatter effects?
4. celestialAccuracy — are stars/moon/celestial objects realistic in size and appearance?
5. terrainNaturalism — organic terrain vs. geometric flat shapes?
6. overallRealism — how close is this to a real night-sky photograph overall?

Respond with ONLY valid JSON (no markdown, no explanation outside the JSON):
{
  "scores": {
    "naturalAppearance": N,
    "depthPerception": N,
    "atmosphericQuality": N,
    "celestialAccuracy": N,
    "terrainNaturalism": N,
    "overallRealism": N
  },
  "issues": ["specific visual problem 1", "specific visual problem 2"],
  "strengths": ["what works well 1"],
  "summary": "one sentence critique"
}`;

async function callClaudeVision(imageBase64: string): Promise<VisionResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: REVIEW_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
  const rawText = data.content[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(rawText) as VisionResult;
    return { ...parsed, rawResponse: rawText };
  } catch {
    return {
      scores: {
        naturalAppearance: 0,
        depthPerception: 0,
        atmosphericQuality: 0,
        celestialAccuracy: 0,
        terrainNaturalism: 0,
        overallRealism: 0,
      },
      issues: ["Failed to parse API response"],
      strengths: [],
      summary: "Parse error",
      rawResponse: rawText,
    };
  }
}

// ── Playwright screenshot ─────────────────────────────────────────────────────

async function screenshotSvg(
  svgPath: string,
  browser: import("playwright").Browser
): Promise<string> {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 960, height: 540 });

  const svgContent = fs.readFileSync(svgPath, "utf8");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#000">
    <div style="width:960px;height:540px;overflow:hidden">${svgContent}</div>
  </body></html>`;

  await page.setContent(html, { waitUntil: "networkidle" });
  const buffer = await page.screenshot({ type: "png" });
  await page.close();
  return buffer.toString("base64");
}

// ── Report types ──────────────────────────────────────────────────────────────

interface VisionReport {
  motif: string;
  mode: string;
  file: string;
  result: VisionResult;
  overallScore: number; // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  screenshotBase64?: string;
}

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildHtml(reports: VisionReport[]): string {
  const sorted = [...reports].sort((a, b) => a.overallScore - b.overallScore);

  const gradeCol: Record<string, string> = {
    A: "#5a9e6e",
    B: "#4a8ab4",
    C: "#d4a04a",
    D: "#d48044",
    F: "#e05252",
  };

  function scoreBar(score: number, max = 10, color = "#4a8ab4"): string {
    const pct = (score / max) * 100;
    return `<div style="display:flex;align-items:center;gap:6px">
      <div style="flex:1;height:4px;background:#1a1a2e;border-radius:2px">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div>
      </div>
      <span style="font-size:10px;color:#9090b0;width:20px;text-align:right">${score}</span>
    </div>`;
  }

  const cards = sorted
    .map(r => {
      const gc = gradeCol[r.grade] ?? "#888";
      const imgSrc = r.screenshotBase64 ? `data:image/png;base64,${r.screenshotBase64}` : "";
      const issueList = r.result.issues
        .map(i => `<li style="color:#c86060;font-size:10px">⚠ ${i}</li>`)
        .join("");
      const strengthList = r.result.strengths
        .map(s => `<li style="color:#5a9e6e;font-size:10px">✓ ${s}</li>`)
        .join("");
      const s = r.result.scores;

      return `
  <div class="card">
    <div class="thumb">${imgSrc ? `<img src="${imgSrc}" width="100%" height="100%" style="object-fit:cover">` : ""}</div>
    <div class="meta">
      <div class="title-row">
        <span class="title">${r.motif} / ${r.mode}</span>
        <span class="grade" style="color:${gc}">${r.grade}</span>
      </div>
      <div style="font-size:10px;color:#5c5c7c;font-style:italic;margin-bottom:6px">"${r.result.summary}"</div>
      <div class="score-grid">
        <span class="sl">Natural</span>${scoreBar(s.naturalAppearance)}
        <span class="sl">Depth</span>${scoreBar(s.depthPerception)}
        <span class="sl">Atmosphere</span>${scoreBar(s.atmosphericQuality)}
        <span class="sl">Celestial</span>${scoreBar(s.celestialAccuracy)}
        <span class="sl">Terrain</span>${scoreBar(s.terrainNaturalism)}
        <span class="sl">Overall</span>${scoreBar(s.overallRealism, 10, gc)}
      </div>
      <ul style="list-style:none;padding:0;margin-top:6px">${issueList}${strengthList}</ul>
    </div>
  </div>`;
    })
    .join("\n");

  const avgScore = Math.round(reports.reduce((s, r) => s + r.overallScore, 0) / reports.length);
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<string, number>;
  for (const r of reports) grades[r.grade]++;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Wallpaper Vision Review</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0e0e18; color: #c8c8d8; font: 12px/1.5 "JetBrains Mono","Fira Code",monospace; }
  header { padding: 24px 32px 16px; border-bottom: 1px solid #1e1e2e; }
  header h1 { font-size: 20px; color: #e8e8f8; }
  header p { color: #6c6c8c; font-size: 11px; margin-top: 4px; }
  .summary { display: flex; gap: 20px; padding: 14px 32px; background: #12121e; border-bottom: 1px solid #1e1e2e; flex-wrap: wrap; align-items: center; }
  .stat { text-align: center; }
  .stat .val { font-size: 24px; font-weight: 700; }
  .stat .lbl { font-size: 10px; color: #6c6c8c; text-transform: uppercase; letter-spacing: 0.08em; }
  .divider { width: 1px; height: 40px; background: #2a2a3a; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; padding: 24px 32px 40px; }
  .card { border: 1px solid #2a2a3a; border-radius: 6px; overflow: hidden; background: #12121e; }
  .thumb { aspect-ratio: 16/10; overflow: hidden; background: #0a0a14; }
  .meta { padding: 10px 12px; }
  .title-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
  .title { font-size: 11px; color: #d0d0e8; font-weight: 700; }
  .grade { font-size: 22px; font-weight: 700; }
  .score-grid { display: grid; grid-template-columns: 80px 1fr; gap: 3px 8px; margin-bottom: 4px; align-items: center; }
  .sl { font-size: 10px; color: #6c6c8c; }
</style>
</head>
<body>
<header>
  <h1>Wallpaper Vision Review — AI Realism Assessment</h1>
  <p>Generated ${new Date().toISOString()} · ${reports.length} SVGs reviewed by Claude claude-haiku-4-5-20251001 · avg realism score ${avgScore}/100</p>
</header>
<div class="summary">
  <div class="stat"><div class="val">${reports.length}</div><div class="lbl">Reviewed</div></div>
  <div class="divider"></div>
  ${Object.entries(grades)
    .map(
      ([g, n]) =>
        `<div class="stat"><div class="val" style="color:${gradeCol[g]}">${n}</div><div class="lbl">Grade ${g}</div></div>`
    )
    .join("\n  ")}
  <div class="divider"></div>
  <div class="stat"><div class="val">${avgScore}</div><div class="lbl">Avg Score</div></div>
</div>
<div class="gallery">
${cards}
</div>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  // Collect SVG paths
  const items: Array<{ motif: string; mode: string; svgPath: string }> = [];
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
      if (fs.existsSync(svgPath)) items.push({ motif, mode, svgPath });
    }
  }

  const toProcess = items.slice(0, limitArg);
  console.log(
    `\nReviewing ${toProcess.length} SVGs with Claude vision (concurrency: ${concurrency})...\n`
  );

  // Launch browser
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  const reports: VisionReport[] = [];

  // Process in batches
  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async ({ motif, mode, svgPath }) => {
        process.stdout.write(`  ${motif}/${mode} ... `);
        try {
          const imgBase64 = await screenshotSvg(svgPath, browser);
          const result = await callClaudeVision(imgBase64);
          const overallScore = Math.round((result.scores.overallRealism / 10) * 100);
          const grade: VisionReport["grade"] =
            overallScore >= 80
              ? "A"
              : overallScore >= 65
                ? "B"
                : overallScore >= 50
                  ? "C"
                  : overallScore >= 35
                    ? "D"
                    : "F";
          console.log(`${grade} (${overallScore}) — ${result.summary}`);
          return {
            motif,
            mode,
            file: path.relative(ROOT, svgPath),
            result,
            overallScore,
            grade,
            screenshotBase64: imgBase64,
          } satisfies VisionReport;
        } catch (err) {
          console.log(`ERROR: ${(err as Error).message}`);
          return {
            motif,
            mode,
            file: path.relative(ROOT, svgPath),
            result: {
              scores: {
                naturalAppearance: 0,
                depthPerception: 0,
                atmosphericQuality: 0,
                celestialAccuracy: 0,
                terrainNaturalism: 0,
                overallRealism: 0,
              },
              issues: [`Error: ${(err as Error).message}`],
              strengths: [],
              summary: "Review failed",
            },
            overallScore: 0,
            grade: "F" as const,
          };
        }
      })
    );
    reports.push(...batchResults);
  }

  await browser.close();

  // Write outputs (without base64 in JSON to keep it small)
  const jsonReports = reports.map(({ screenshotBase64: _, ...r }) => r);
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ generatedAt: new Date().toISOString(), reports: jsonReports }, null, 2)
  );
  console.log(`\n✓ ${OUT_JSON}`);

  fs.writeFileSync(OUT_HTML, buildHtml(reports));
  console.log(`✓ ${OUT_HTML}`);

  const avgScore = Math.round(reports.reduce((s, r) => s + r.overallScore, 0) / reports.length);
  console.log(`\nAvg vision realism score: ${avgScore}/100\n`);
}

run().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
