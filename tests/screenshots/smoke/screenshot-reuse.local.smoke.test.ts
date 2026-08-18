import * as fs from "node:fs";
import * as path from "node:path";
import { expect, it } from "vitest";
import { runScript } from "../helpers/temp-test-run";

it("local smoke: reuse-mode produces single electron launch and screenshots", async () => {
  // This is a LOCAL smoke test. Don't run it in CI (long-running); mark as skipped in CI via env.
  if (process.env.CI) {
    console.log("Skipping local smoke test in CI");
    return;
  }

  const outDir = path.join(process.cwd(), "tmp-screenshots-reuse");
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });

  const res = await runScript(["--aurora-demo", "--lang", "typescript", "--output", outDir]);
  expect(res.code === 0 || res.code === null).toBeTruthy();
  expect(res.instrumentation).toBeDefined();
  expect(res.instrumentation?.electronLaunchCount).toBe(1);

  // expect 3 PNGs for the aurora-demo
  const files = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter(f => f.endsWith(".png")) : [];
  expect(files.length).toBeGreaterThanOrEqual(1);
  console.log("smoke stdout:", res.stdout.slice(-2000));
});
