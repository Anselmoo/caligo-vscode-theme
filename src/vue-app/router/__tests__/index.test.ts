import { describe, expect, it } from "vitest";
import router from "../index.js";

describe("router", () => {
  it("registers dedicated export route", () => {
    const resolved = router.resolve("/export");

    expect(resolved.name).toBe("export");
    expect(resolved.meta.title).toBe("Export — Caligo Themes");
  });
});
