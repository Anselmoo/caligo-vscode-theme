import { describe, expect, it } from "vitest";
import { resolveScreenshotPath } from "../asset-paths";

describe("resolveScreenshotPath", () => {
  it("prefixes a bare filename with the screenshots folder", () => {
    expect(resolveScreenshotPath("deep-sable.png", "/caligo/")).toBe(
      "/caligo/screenshots/deep-sable.png"
    );
  });

  it("keeps a path that already starts with screenshots/", () => {
    expect(resolveScreenshotPath("/screenshots/deep-sable.png", "/caligo/")).toBe(
      "/caligo/screenshots/deep-sable.png"
    );
  });

  it("drops any other folders and adds the missing trailing slash to the base", () => {
    expect(resolveScreenshotPath("build/out/deep-sable.png", "/caligo")).toBe(
      "/caligo/screenshots/deep-sable.png"
    );
  });

  it("defaults to the app's base URL", () => {
    expect(resolveScreenshotPath("deep-sable.png")).toMatch(/\/screenshots\/deep-sable\.png$/);
  });
});
