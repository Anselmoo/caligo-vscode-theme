import fs from "node:fs";
import path from "node:path";

const src: string = path.join(process.cwd(), "tests", "screenshots", "test-samples");
const dest: string = path.join(process.cwd(), "out", "tests", "screenshots", "test-samples");

if (!fs.existsSync(src)) {
  console.warn("No test-samples directory to copy");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const name of fs.readdirSync(src)) {
  const s = path.join(src, name);
  const d = path.join(dest, name);
  fs.copyFileSync(s, d);
  console.log("Copied", s, "->", d);
}
