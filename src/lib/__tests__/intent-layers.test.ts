import { describe, expect, it } from "vitest";
import { deriveIntentPalette, deriveIntentSemanticTokenColors } from "../intent-layers.js";

describe("deriveIntentSemanticTokenColors", () => {
  it("maps tokens to intent palette colors", () => {
    const palette = deriveIntentPalette(35, 0.15, "balanced");

    const tokens = deriveIntentSemanticTokenColors(palette, "#999999");

    // Functions should be declaration color
    expect(tokens.function).toBe(palette.declaration);

    // Variable should map to usage
    expect(tokens.variable).toBe(palette.usage);

    // Keyword should map to controlFlow
    expect(tokens.keyword).toBe(palette.controlFlow);

    // String should map to data
    expect(tokens.string).toBe(palette.data);

    // Comments should use muted FG
    expect(typeof tokens.comment).toBe("object");
    expect((tokens.comment as { foreground?: string }).foreground).toBe("#999999");

    // Deprecated style should include both italic and strikethrough
    const depStyle = (tokens["*.deprecated"] as { fontStyle?: string }).fontStyle;
    expect(depStyle?.includes("italic")).toBe(true);
    expect(depStyle?.includes("strikethrough")).toBe(true);

    expect((tokens["*.definition"] as { fontStyle?: string }).fontStyle).toBe("bold");
    expect((tokens["*.readonly"] as { fontStyle?: string }).fontStyle).toBe("underline");
    expect((tokens["*.defaultLibrary"] as { fontStyle?: string }).fontStyle).toBe("bold");
    expect(tokens["function.definition"]).toBe(palette.declaration);
    expect(tokens["variable.definition"]).toBe(palette.declaration);
    expect(tokens.modifier).toBe(palette.controlFlow);
  });
});
