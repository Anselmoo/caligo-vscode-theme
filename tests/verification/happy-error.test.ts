import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

interface PackageJson {
  publisher?: string;
  name?: string;
  engines?: { vscode?: string };
  scripts?: { [key: string]: string };
}

function validatePackage(pkg: PackageJson) {
  if (!pkg) return false;
  if (!pkg.publisher || !pkg.name || !pkg.engines || !pkg.engines.vscode) return false;
  if (!pkg.scripts) return false;
  const pre = pkg.scripts["vscode:prepublish"] || "";
  const hasBuild = pre.includes("build");
  const hasGenerate = pre.includes("generate");
  const hasTest = pre.includes("test");
  return hasBuild && hasGenerate && hasTest;
}

// Happy path: current package.json should validate
test("package validation happy path", () => {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));
  expect(validatePackage(pkg)).toBe(true);
});

// Error conditions: missing scripts or metadata should fail validation
test("package validation error conditions", () => {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));
  const missingPre = { ...pkg, scripts: { ...pkg.scripts } };
  delete missingPre.scripts["vscode:prepublish"];
  expect(validatePackage(missingPre)).toBe(false);

  const missingPublisher = { ...pkg };
  delete missingPublisher.publisher;
  expect(validatePackage(missingPublisher)).toBe(false);
});
