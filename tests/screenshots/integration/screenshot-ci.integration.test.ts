import * as fs from "node:fs";
import * as path from "node:path";
import { expect, it } from "vitest";
import { runScript } from "../helpers/temp-test-run";

it("ci integration: full theme run should use single electron launch", async () => {
  // Only run in CI
  if (!process.env.CI) {
    console.log("Skipping CI integration test locally");
    return;
  }

  const outDir = path.join(process.cwd(), "tmp-screenshots-reuse-ci");
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });

  // Use full run (this may be long on CI; workflow should gate and have proper timeout)
  const res = await runScript(
    ["--full", "--lang", "typescript", "--output", outDir],
    process.cwd(),
    60 * 60 * 1000
  );
  expect(res.code === 0 || res.code === null).toBeTruthy();
  expect(res.instrumentation).toBeDefined();
  expect(res.instrumentation.electronLaunchCount).toBe(1);

  // Upload artifact step will pick up screenshots separately; here just validate report exists
  const reportPath = path.join(process.cwd(), "build", "screenshots-report.json");
  expect(fs.existsSync(reportPath)).toBeTruthy();
});
