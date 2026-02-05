import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export function runScript(
  args: string[],
  cwd = process.cwd(),
  timeout = 5 * 60 * 1000
): Promise<{ code: number | null; stdout: string; stderr: string } & { instrumentation?: any }> {
  return new Promise((resolve, reject) => {
    const cp = spawn("npx", ["tsx", "scripts/capture-vscode-screenshots-reuse.ts", ...args], {
      cwd,
      env: { ...process.env, CI: process.env.CI ?? "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    cp.stdout.on("data", d => {
      stdout += String(d);
    });
    cp.stderr.on("data", d => {
      stderr += String(d);
    });

    const timer = setTimeout(() => {
      cp.kill("SIGKILL");
      resolve({ code: null, stdout, stderr });
    }, timeout);

    cp.on("close", code => {
      clearTimeout(timer);
      const reportPath = path.join(process.cwd(), "build", "screenshots-report.json");
      let instrumentation: unknown;
      try {
        if (fs.existsSync(reportPath))
          instrumentation = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
      } catch (_e) {
        instrumentation = undefined;
      }
      resolve({ code, stdout, stderr, instrumentation });
    });
  });
}
