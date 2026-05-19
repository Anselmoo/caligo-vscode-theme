/**
 * wallpaper-dev.ts — Live SVG preview with hot-reload for wallpaper development.
 *
 * Usage:
 *   npx tsx scripts/wallpaper-dev.ts [--motif=VoidEmber] [--mode=none] [--platform=monitor]
 *
 * Serves a single wallpaper SVG at http://localhost:5051 with automatic
 * re-render + browser refresh when any file in src/wallpaper/ changes.
 */

import { watch } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const WATCH_DIR = join(PROJECT_ROOT, "src", "wallpaper");

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function arg(name: string, fallback: string): string {
  const match = args.find(a => a.startsWith(`--${name}=`));
  return match ? match.split("=")[1] : fallback;
}

const MOTIF = arg("motif", "VoidEmber");
const MODE = arg("mode", "none");
const PLATFORM = arg("platform", "monitor") as "monitor" | "tablet" | "mobile";
const PORT = Number(arg("port", "5051"));

// ─── Harmony mode → ThemeMode mapping ────────────────────────────────────────

type ThemeMode = "Balanced" | "Analogous" | "Monochromatic" | "Triadic" | "SplitComplementary";

const HARMONY_TO_THEME: Record<string, ThemeMode> = {
  none: "Balanced",
  analogous: "Analogous",
  monochromatic: "Monochromatic",
  triadic: "Triadic",
  "split-complementary": "SplitComplementary",
};

// ─── SVG rendering (dynamic import for hot-reload) ───────────────────────────

let renderCount = 0;

async function renderSvg(): Promise<string> {
  const cacheBust = `?t=${Date.now()}-${++renderCount}`;

  // Dynamic imports bypass the module cache when the query string changes.
  // tsx (via esbuild) re-transpiles the source on each import.
  const { loadAllSeeds, expandSeedVariants } = await import(`../src/lib/seeds.js${cacheBust}`);
  const { derivePalette } = await import(`../src/lib/palette.js${cacheBust}`);
  const { renderWallpaperSvg } = await import(`../src/wallpaper/renderer.js${cacheBust}`);
  const { MODE_TOPICS } = await import(`../src/wallpaper/types.js${cacheBust}`);

  const baseSeeds = await loadAllSeeds();
  const seed = baseSeeds.find((s: { id: string }) => s.id === MOTIF);
  if (!seed) {
    const available = baseSeeds.map((s: { id: string }) => s.id).join(", ");
    throw new Error(`Motif "${MOTIF}" not found. Available: ${available}`);
  }

  const variants = expandSeedVariants(seed);
  const variant =
    variants.find((v: { harmony?: string }) => (v.harmony ?? "none") === MODE) ?? variants[0];

  const themeMode = HARMONY_TO_THEME[MODE] ?? "Balanced";
  const palette = derivePalette(variant, themeMode);
  const topic = MODE_TOPICS[MODE] ?? "Core";

  const svg = renderWallpaperSvg({
    palette,
    spec: {
      seedId: MOTIF,
      seedDisplayName: seed.displayName,
      harmonyMode: MODE,
      topic,
      platform: PLATFORM,
      textVariant: "no-text",
      displayName: `${seed.displayName} · ${topic}`,
    },
  });

  return svg;
}

// ─── SSE clients ─────────────────────────────────────────────────────────────

const sseClients = new Set<ServerResponse>();

function broadcast(event: string, data: string) {
  for (const res of sseClients) {
    res.write(`event: ${event}\ndata: ${data}\n\n`);
  }
}

// ─── Cached SVG ──────────────────────────────────────────────────────────────

let cachedSvg = "";

async function regenerate() {
  const t0 = Date.now();
  try {
    cachedSvg = await renderSvg();
    const ms = Date.now() - t0;
    console.log(`  ✓ Rendered in ${ms}ms`);
    broadcast("reload", `${Date.now()}`);
  } catch (err) {
    console.error("  ✗ Render failed:", (err as Error).message);
    broadcast("error", (err as Error).message);
  }
}

// ─── HTML shell ──────────────────────────────────────────────────────────────

function htmlPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Wallpaper Dev — ${MOTIF} / ${MODE} / ${PLATFORM}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; display: flex; flex-direction: column;
           align-items: center; justify-content: center; min-height: 100vh;
           font-family: system-ui, sans-serif; color: #8899aa; }
    h1 { font-size: 14px; letter-spacing: 0.04em; margin: 12px 0 8px;
         color: #667788; font-weight: 400; }
    .status { font-size: 11px; color: #445566; margin-bottom: 10px; }
    .status.error { color: #cc4444; }
    img { max-width: 96vw; max-height: 85vh; border: 1px solid #1a1d26;
          border-radius: 6px; }
  </style>
</head>
<body>
  <h1>${MOTIF} · ${MODE} · ${PLATFORM}</h1>
  <div class="status" id="status">Connected</div>
  <img id="preview" src="/wallpaper.svg" alt="Wallpaper preview">
  <script>
    const img = document.getElementById('preview');
    const status = document.getElementById('status');
    const es = new EventSource('/events');
    es.addEventListener('reload', () => {
      img.src = '/wallpaper.svg?t=' + Date.now();
      status.textContent = 'Updated ' + new Date().toLocaleTimeString();
      status.className = 'status';
    });
    es.addEventListener('error', (e) => {
      status.textContent = 'Error: ' + e.data;
      status.className = 'status error';
    });
    es.onerror = () => {
      status.textContent = 'Disconnected — waiting for server…';
      status.className = 'status error';
    };
  </script>
</body>
</html>`;
}

// ─── HTTP server ─────────────────────────────────────────────────────────────

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = req.url?.split("?")[0] ?? "/";

  if (url === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(":\n\n");
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  if (url === "/wallpaper.svg") {
    res.writeHead(200, {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache",
    });
    res.end(cachedSvg);
    return;
  }

  // Default: HTML shell
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(htmlPage());
});

// ─── File watcher ────────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(WATCH_DIR, { recursive: true }, (_event, filename) => {
  if (!filename?.endsWith(".ts")) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`  ↻ ${filename} changed — re-rendering…`);
    regenerate();
  }, 250);
});

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎨 Wallpaper Dev Server");
  console.log(`   Motif:    ${MOTIF}`);
  console.log(`   Mode:     ${MODE}`);
  console.log(`   Platform: ${PLATFORM}`);
  console.log("   Watching: src/wallpaper/**/*.ts");
  console.log("─".repeat(44));

  await regenerate();

  server.listen(PORT, () => {
    console.log(`\n   → http://localhost:${PORT}\n`);
  });
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
