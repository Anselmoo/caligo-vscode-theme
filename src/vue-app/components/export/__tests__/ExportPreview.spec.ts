import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ExportPreview from "../ExportPreview.vue";

describe("ExportPreview", () => {
  it("highlights lines matching selected token across naming styles", () => {
    const wrapper = mount(ExportPreview, {
      props: {
        content: '--fg-muted: #999;\n"fgMuted": "#999";\naccent: #fff;',
        highlightToken: "fgMuted",
      },
    });

    const highlighted = wrapper.findAll(".export-preview__line--highlight");
    expect(highlighted).toHaveLength(2);
    expect(highlighted[0].text()).toContain("--fg-muted");
    expect(highlighted[1].text()).toContain('"fgMuted"');
  });
});
