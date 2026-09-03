/**
 * Caligo palette inspector.
 *
 * Renders every colour a theme emits -- workbench, syntax, semantic, decorative,
 * bracket and ANSI -- into one page, so a person can see at a glance which
 * colours harmonise and which collide.
 *
 * The plot is polar because the question is about hue relationships: angle is
 * hue, radius is lightness, marker size is chroma. A harmonious palette spreads
 * around the circle; a collision is two marks at the same angle and radius.
 * Marks are painted in the colour they represent -- here the data IS the colour
 * -- so layer identity rides on marker SHAPE instead, and never on colour alone.
 *
 *   npx tsx scripts/palette-inspector.ts            # all 50 themes
 *   npx tsx scripts/palette-inspector.ts --theme AuroraNoir
 *
 * Writes build/palette-inspector.html.
 */

import fs from "node:fs";
import path from "node:path";
import { converter } from "culori";
import { requiredSeparation, SEPARATION_FLOOR, separation } from "../src/lib/separation-ladder.js";

const toOklch = converter("oklch");

type Swatch = { key: string; hex: string; layer: Layer; l: number; c: number; h: number };
type Layer = "syntax" | "semantic" | "decor" | "bracket" | "ansi" | "accent" | "surface";

/** Marker shape per layer, so identity never depends on colour. */
const SHAPE: Record<Layer, string> = {
  syntax: "circle",
  semantic: "diamond",
  decor: "square",
  bracket: "triangle",
  ansi: "hexagon",
  accent: "star",
  surface: "ring",
};

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

function collect(theme: Record<string, unknown>): Swatch[] {
  const colors = (theme.colors ?? {}) as Record<string, string>;
  const out: Swatch[] = [];
  const add = (key: string, hex: string, layer: Layer) => {
    if (!isHex(hex)) return;
    const o = toOklch(hex) as { l: number; c: number; h?: number };
    out.push({ key, hex: hex.toLowerCase(), layer, l: o.l, c: o.c, h: o.h ?? 0 });
  };

  for (const [k, v] of Object.entries(colors)) {
    if (k.startsWith("editorBracketHighlight.foreground")) add(k, v, "bracket");
    else if (k.startsWith("terminal.ansi")) add(k, v, "ansi");
  }
  for (const k of ["editorError", "editorWarning", "editorInfo"]) {
    add(k, colors[`${k}.foreground`], "semantic");
  }
  add("gitAdded", colors["gitDecoration.addedResourceForeground"], "semantic");
  add("focusBorder", colors.focusBorder, "accent");
  add("editor.background", colors["editor.background"], "surface");
  add("editor.foreground", colors["editor.foreground"], "surface");

  const seen = new Set(out.map(s => s.key));
  for (const rule of (theme.tokenColors ?? []) as {
    name?: string;
    settings?: { foreground?: string };
  }[]) {
    const fg = rule.settings?.foreground;
    if (!isHex(fg) || seen.has(rule.name ?? "")) continue;
    add(rule.name ?? fg, fg, "syntax");
  }
  return out;
}

/**
 * Pairs closer than the distance their own hue relationship demands.
 *
 * Deduplicated by hex first. One colour reused across several scopes is a
 * deliberate share, not a collision -- counting each reuse as a zero-distance
 * pair reported 475 collisions on a theme the build gate passes at zero, which
 * is worse than useless in a tool meant to be trusted.
 */
function collisions(sw: Swatch[]) {
  const out: { a: Swatch; b: Swatch; d: number; need: number }[] = [];
  const byHex = new Map<string, Swatch>();
  for (const s of sw) if (s.layer !== "surface" && !byHex.has(s.hex)) byHex.set(s.hex, s);
  const ok = [...byHex.values()];
  for (let i = 0; i < ok.length; i++) {
    for (let j = i + 1; j < ok.length; j++) {
      const A = { mode: "oklch" as const, l: ok[i].l, c: ok[i].c, h: ok[i].h };
      const B = { mode: "oklch" as const, l: ok[j].l, c: ok[j].c, h: ok[j].h };
      const d = separation(A, B);
      const need = requiredSeparation(A, B, SEPARATION_FLOOR);
      if (d > 0 && d < need) out.push({ a: ok[i], b: ok[j], d, need });
    }
  }
  return out.sort((x, y) => x.d - y.d);
}

const R = 150;
const CX = 180;
const CY = 180;
const L_MIN = 0.4;

function marker(s: Swatch): string {
  const rad = ((s.h - 90) * Math.PI) / 180;
  const norm = Math.max(0, Math.min(1, (s.l - L_MIN) / (1 - L_MIN)));
  const x = CX + Math.cos(rad) * norm * R;
  const y = CY + Math.sin(rad) * norm * R;
  const size = 4 + Math.min(s.c, 0.3) * 26;
  const t = `<title>${s.key}\n${s.hex}  L ${s.l.toFixed(2)}  C ${s.c.toFixed(3)}  H ${s.h.toFixed(0)}</title>`;
  // 2px surface ring so overlapping marks stay countable.
  const stroke = `stroke="var(--ground)" stroke-width="2"`;
  switch (SHAPE[s.layer]) {
    case "diamond":
      return `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" transform="rotate(45 ${x} ${y})" fill="${s.hex}" ${stroke}>${t}</rect>`;
    case "square":
      return `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="${s.hex}" ${stroke}>${t}</rect>`;
    case "triangle":
      return `<polygon points="${x},${y - size / 1.6} ${x + size / 1.8},${y + size / 2.4} ${x - size / 1.8},${y + size / 2.4}" fill="${s.hex}" ${stroke}>${t}</polygon>`;
    case "hexagon": {
      const p = Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 3) * k - Math.PI / 2;
        return `${x + (Math.cos(a) * size) / 1.5},${y + (Math.sin(a) * size) / 1.5}`;
      }).join(" ");
      return `<polygon points="${p}" fill="${s.hex}" ${stroke}>${t}</polygon>`;
    }
    case "star":
      return `<circle cx="${x}" cy="${y}" r="${size / 1.6}" fill="${s.hex}" stroke="var(--ink)" stroke-width="1.5">${t}</circle>`;
    case "ring":
      return `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="none" stroke="${s.hex}" stroke-width="2.5">${t}</circle>`;
    default:
      return `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${s.hex}" ${stroke}>${t}</circle>`;
  }
}

function plot(sw: Swatch[]): string {
  // Recessive polar grid: three lightness rings and the six hue families.
  const rings = [0.33, 0.66, 1]
    .map(
      f =>
        `<circle cx="${CX}" cy="${CY}" r="${R * f}" fill="none" stroke="var(--grid)" stroke-width="1"/>`
    )
    .join("");
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 90) * Math.PI) / 180;
    return `<line x1="${CX}" y1="${CY}" x2="${CX + Math.cos(a) * R}" y2="${CY + Math.sin(a) * R}" stroke="var(--grid)" stroke-width="1"/>`;
  }).join("");
  const labels = [
    [0, "0°"],
    [60, "60°"],
    [120, "120°"],
    [180, "180°"],
    [240, "240°"],
    [300, "300°"],
  ]
    .map(([deg, txt]) => {
      const a = (((deg as number) - 90) * Math.PI) / 180;
      return `<text x="${CX + Math.cos(a) * (R + 14)}" y="${CY + Math.sin(a) * (R + 14) + 4}" text-anchor="middle" class="ax">${txt}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 360 372" role="img" aria-label="Palette in OKLCH: angle is hue, radius is lightness, size is chroma">
    ${rings}${spokes}${labels}
    ${sw.map(marker).join("")}
    <text x="${CX}" y="366" text-anchor="middle" class="ax">angle = hue · radius = lightness · size = chroma</text>
  </svg>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function main(): void {
  const only = process.argv.includes("--theme")
    ? process.argv[process.argv.indexOf("--theme") + 1]
    : undefined;
  const dir = "build/themes";
  if (!fs.existsSync(dir)) {
    console.error("Missing build/themes. Run `npm run generate` first.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .filter(f => !only || f.includes(only))
    .sort();

  const cards = files.map(f => {
    const theme = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const all = collect(theme);
    // Plot one mark per distinct colour; reuse across scopes is not crowding.
    const seenHex = new Set<string>();
    const sw = all.filter(s => {
      if (seenHex.has(s.hex)) return false;
      seenHex.add(s.hex);
      return true;
    });
    const col = collisions(all);
    const name = String(theme.name).replace(/^Caligo \(|\)$/g, "");
    const bg = theme.colors["editor.background"];
    const distinct = new Set(sw.filter(s => s.layer !== "surface").map(s => s.hex)).size;

    const worst = col
      .slice(0, 6)
      .map(
        p =>
          `<li><i style="background:${p.a.hex}"></i><i style="background:${p.b.hex}"></i>
        <span>${esc(p.a.key)} · ${esc(p.b.key)}</span>
        <b>${p.d.toFixed(3)}</b><span class="need">needs ${p.need.toFixed(2)}</span></li>`
      )
      .join("");

    const byLayer = new Map<Layer, number>();
    for (const s of sw) byLayer.set(s.layer, (byLayer.get(s.layer) ?? 0) + 1);

    return `<figure style="--bg:${bg}">
  <figcaption><span class="seed">${esc(name)}</span>
    <span class="stat ${col.length ? "warn" : "ok"}">${col.length === 0 ? "no collisions" : `${col.length} collision${col.length > 1 ? "s" : ""}`}</span></figcaption>
  <div class="plot">${plot(sw)}</div>
  <dl class="counts">
    <div><dt>colours</dt><dd>${distinct}</dd></div>
    ${[...byLayer]
      .filter(([l]) => l !== "surface")
      .map(([l, n]) => `<div><dt>${l}</dt><dd>${n}</dd></div>`)
      .join("")}
  </dl>
  ${col.length ? `<ul class="pairs">${worst}${col.length > 6 ? `<li class="more">+${col.length - 6} more</li>` : ""}</ul>` : ""}
</figure>`;
  });

  const totalCollisions = files.length;
  const html = `<!doctype html>
<meta charset="utf-8">
<title>Caligo Palette Inspector</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
 :root{--ground:#f7f6f4;--ink:#16181c;--muted:#6b7079;--line:#e2e0dc;--panel:#fff;
       --grid:#dcd9d4;--ok:#2f6f3e;--warn:#a8541b;
       --ui:"Archivo",-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,monospace;}
 @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
   --ground:#0b0d10;--ink:#e9eaed;--muted:#8b909a;--line:#22262d;--panel:#101318;
   --grid:#23272f;--ok:#6fbe84;--warn:#e0a06a;}}
 :root[data-theme="dark"]{--ground:#0b0d10;--ink:#e9eaed;--muted:#8b909a;--line:#22262d;
   --panel:#101318;--grid:#23272f;--ok:#6fbe84;--warn:#e0a06a;}
 *{box-sizing:border-box}
 body{margin:0;padding:32px 28px 64px;background:var(--ground);color:var(--ink);
      font-family:var(--ui);font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased}
 header{max-width:64ch;display:flex;flex-direction:column;gap:8px;margin-bottom:24px}
 h1{font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0;text-wrap:balance}
 header p{margin:0;color:var(--muted)}
 .key{display:flex;flex-wrap:wrap;gap:14px;padding:12px 0 20px;border-bottom:1px solid var(--line);
      margin-bottom:24px;font-size:12px;color:var(--muted)}
 .key span{display:flex;align-items:center;gap:6px}
 .key svg{overflow:visible}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:18px}
 figure{margin:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)}
 figcaption{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
            padding:10px 14px;border-bottom:1px solid var(--line)}
 .seed{font-size:13px;font-weight:600;letter-spacing:-.01em}
 .stat{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;font-weight:500}
 .stat.ok{color:var(--ok)} .stat.warn{color:var(--warn)}
 .plot{background:var(--bg);padding:6px 0}
 svg{display:block;width:100%;height:auto}
 .ax{fill:var(--muted);font-family:var(--ui);font-size:9px}
 .counts{display:flex;flex-wrap:wrap;gap:0 16px;margin:0;padding:10px 14px;
         border-top:1px solid var(--line);font-size:11px}
 .counts div{display:flex;gap:5px}
 .counts dt{color:var(--muted);margin:0} .counts dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums}
 .pairs{list-style:none;margin:0;padding:8px 14px 12px;border-top:1px solid var(--line);
        font-size:11px;display:flex;flex-direction:column;gap:5px}
 .pairs li{display:flex;align-items:center;gap:6px}
 .pairs i{width:12px;height:12px;border-radius:3px;flex:none;box-shadow:inset 0 0 0 1px rgba(128,128,128,.4)}
 .pairs span{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
 .pairs b{font-family:var(--mono);font-variant-numeric:tabular-nums;color:var(--warn)}
 .pairs .need{flex:none;font-size:10px;opacity:.7}
 .pairs .more{color:var(--muted);font-style:italic}
</style>
<header>
  <h1>Caligo Palette Inspector</h1>
  <p>Every colour each theme emits, placed in OKLCH. A harmonious palette spreads around the circle; two marks at the same angle and radius are a collision. Hover any mark for its key and coordinates.</p>
</header>
<div class="key">
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="var(--muted)"/></svg>syntax</span>
  <span><svg width="14" height="14"><rect x="3" y="3" width="8" height="8" transform="rotate(45 7 7)" fill="var(--muted)"/></svg>semantic</span>
  <span><svg width="14" height="14"><rect x="2.5" y="2.5" width="9" height="9" fill="var(--muted)"/></svg>decorative</span>
  <span><svg width="14" height="14"><polygon points="7,2 12,11 2,11" fill="var(--muted)"/></svg>bracket</span>
  <span><svg width="14" height="14"><polygon points="7,1.5 12,4.5 12,9.5 7,12.5 2,9.5 2,4.5" fill="var(--muted)"/></svg>ANSI</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="4.5" fill="var(--muted)" stroke="var(--ink)" stroke-width="1.5"/></svg>accent</span>
  <span><svg width="14" height="14"><circle cx="7" cy="7" r="4.5" fill="none" stroke="var(--muted)" stroke-width="2.5"/></svg>surface</span>
</div>
<div class="grid">
${cards.join("\n")}
</div>`;

  fs.mkdirSync("build", { recursive: true });
  const out = path.join("build", "palette-inspector.html");
  fs.writeFileSync(out, html);
  console.log(`✅ ${out}  (${totalCollisions} theme${totalCollisions > 1 ? "s" : ""})`);
}

main();
