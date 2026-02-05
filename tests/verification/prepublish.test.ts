import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));

test("vscode:prepublish script exists in package.json", () => {
  expect(pkg.scripts["vscode:prepublish"]).toBeDefined();
});

test("marketplace scripts exist", () => {
  expect(pkg.scripts["marketplace:package"]).toBeDefined();
  expect(pkg.scripts["marketplace:publish"]).toBeDefined();
});
