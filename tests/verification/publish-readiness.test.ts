import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));

test("package.json has required marketplace metadata", () => {
  expect(pkg.publisher).toBeTruthy();
  expect(pkg.name).toBeTruthy();
  expect(pkg.displayName).toBeTruthy();
  expect(pkg.engines?.vscode).toBeTruthy();
  expect(pkg.categories?.length).toBeGreaterThan(0);
  expect(pkg.icon).toBeTruthy();
  expect(pkg.license).toBeTruthy();
  expect(
    pkg.repository &&
      typeof pkg.repository.url === "string" &&
      /^https?:\/\//.test(pkg.repository.url)
  ).toBe(true);
});

test("prepublish script exists", () => {
  expect(pkg.scripts?.["vscode:prepublish"]).toBeTruthy();
});

test("publish workflow exists and uses vsce", () => {
  // cicd consolidated; check cicd.yml for packaging/publish commands
  const workflowPath = resolve(process.cwd(), ".github", "workflows", "cicd.yml");
  const workflow = readFileSync(workflowPath, "utf-8");
  // Accept vsce package/publish or npm scripts that invoke packaging/publish
  expect(
    workflow.includes("vsce package") ||
      workflow.includes("npx vsce") ||
      workflow.includes("release:ci") ||
      workflow.includes("marketplace:package")
  ).toBe(true);
  expect(
    workflow.includes("vsce publish") ||
      workflow.includes("npx vsce") ||
      workflow.includes("marketplace:publish") ||
      workflow.includes("release:ci")
  ).toBe(true);
});

test("release workflow uploads source/themes archives and themes sbom", () => {
  const workflowPath = resolve(process.cwd(), ".github", "workflows", "cicd.yml");
  const workflow = readFileSync(workflowPath, "utf-8");
  const sourceArchivePattern = /caligo-vscode-theme-\$\{\{ github\.ref_name \}\}-source\.tar\.gz/;
  const themesArchivePattern = /caligo-vscode-theme-\$\{\{ github\.ref_name \}\}-themes\.tar\.gz/;
  expect(sourceArchivePattern.test(workflow)).toBe(true);
  expect(themesArchivePattern.test(workflow)).toBe(true);
  expect(workflow.includes("Generate themes SBOM")).toBe(true);
  expect(workflow.includes("sbom-themes-spdx.json")).toBe(true);
});

test("LICENSE exists and is non-empty", () => {
  const lic = readFileSync(resolve(process.cwd(), "LICENSE"), "utf-8");
  expect(lic.trim().length).toBeGreaterThan(0);
});
