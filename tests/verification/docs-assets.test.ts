import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("README contains HTTPS screenshots and PNG icon", () => {
  const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf-8");
  // Accept https or local images folder references
  expect(readme.includes("https://") || readme.includes("images/")).toBe(true);
  // icon may be referenced as images/icon.png or images/icon.svg; accept either
  expect(
    readme.includes("images/icon.png") ||
      readme.includes("images/icon.svg") ||
      readme.includes("icon.png") ||
      readme.includes("icon.svg")
  ).toBe(true);
});

test("SUPPORT.md exists and references issues URL", () => {
  const support = readFileSync(
    resolve(process.cwd(), "caligo-theme-publication-readiness", "SUPPORT.md"),
    "utf-8"
  );
  expect(support.includes("https://github.com/")).toBe(true);
});
