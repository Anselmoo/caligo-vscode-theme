import fs from "node:fs";
import path from "node:path";

const dir: string = path.join(process.cwd(), "out", "tests");

function walk(directory: string): void {
  for (const name of fs.readdirSync(directory)) {
    const full = path.join(directory, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (stat.isFile() && full.endsWith(".js")) {
      const newPath = full.replace(/\.js$/, ".cjs");
      fs.renameSync(full, newPath);
      console.log("Renamed", full, "->", newPath);
    }
  }
}

if (fs.existsSync(dir)) walk(dir);
