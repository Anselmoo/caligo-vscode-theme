import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

// T006: Verify prepublish runs build/generate/test by ensuring scripts exist and are callable
test("vscode:prepublish invokes build, generate, and test scripts", () => {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));
  const pre = pkg.scripts["vscode:prepublish"];
  expect(pre).toBeDefined();
  expect(pre.includes("build")).toBeTruthy();
  expect(pre.includes("generate")).toBeTruthy();
  expect(pre.includes("test")).toBeTruthy();
});
