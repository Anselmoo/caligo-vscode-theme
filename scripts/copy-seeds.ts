import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE_DIR = join(process.cwd(), "src", "seeds");
// Vite serves static assets from the repo-root `public/` directory.
// Keep seed JSONs there so they are available at `/seeds/<id>.json`.
const TARGET_DIR = join(process.cwd(), "public", "seeds");

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function copySeeds() {
  ensureDir(TARGET_DIR);
  const files = readdirSync(SOURCE_DIR).filter(f => f.endsWith(".json"));

  let copied = 0;
  for (const file of files) {
    const src = join(SOURCE_DIR, file);
    const dst = join(TARGET_DIR, file);
    const stats = statSync(src);
    if (!stats.isFile()) continue;
    copyFileSync(src, dst);
    copied += 1;
  }

  console.log(`✅ Copied ${copied} seed files to public/seeds`);
}

copySeeds();
