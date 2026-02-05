import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("LICENSE file exists and contains MIT", () => {
  const license = readFileSync(resolve(process.cwd(), "LICENSE"), "utf-8");
  expect(license.includes("MIT License") || license.includes("MIT")).toBe(true);
});
