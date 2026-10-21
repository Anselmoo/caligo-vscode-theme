import { describe, expect, it } from "vitest";
import router from "../index.js";

describe("router", () => {
  it("sends the old export page to the export section of Themes", async () => {
    await router.push("/export");
    expect(router.currentRoute.value.name).toBe("themes");
    expect(router.currentRoute.value.hash).toBe("#export");
  });

  it("keeps the pre-2026 URLs working", async () => {
    await router.push("/gallery");
    expect(router.currentRoute.value.name).toBe("themes");
    await router.push("/analysis");
    expect(router.currentRoute.value.name).toBe("science");
  });
});
