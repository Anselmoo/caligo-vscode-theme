import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

// T014: Basic check that .vscodeignore exists and common dev files are excluded from packaging
test(".vscodeignore exists and excludes common dev artifacts", () => {
  const ignore = readFileSync(resolve(process.cwd(), ".vscodeignore"), "utf-8");
  expect(ignore.includes("node_modules/**") || ignore.includes("node_modules/")).toBe(true);
  expect(ignore.includes("build/**") || ignore.includes("build/")).toBe(true);
  expect(ignore.includes("tests/**") || ignore.includes("tests/")).toBe(true);
  expect(ignore.includes("*.vsix")).toBe(true);
});

// Sanity: ensure themes directory exists and has JSON files
test("themes directory contains JSON theme files", () => {
  const files = readdirSync(resolve(process.cwd(), "themes"));
  const json = files.filter(f => f.endsWith(".json"));
  expect(json.length).toBeGreaterThan(0);
});
