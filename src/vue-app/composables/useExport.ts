import { computed, ref } from "vue";
import { derivePalette } from "../../core/palette.js";
import { EXPORT_FORMATTERS, getFormatter } from "../../export/formatter-registry.js";
import type { ExportFormat, ExportResult } from "../../export/types.js";
import type { HarmonyMode } from "../../types/harmony.js";
import { useTheme } from "./useTheme.js";

function toHarmonyMode(harmonyId: string): HarmonyMode {
  if (harmonyId === "balanced") return "none";
  if (harmonyId === "analogous") return "analogous";
  if (harmonyId === "monochromatic") return "monochromatic";
  if (harmonyId === "triadic") return "triadic";
  if (harmonyId === "split-complementary") return "split-complementary";
  return "none";
}

export function useExport() {
  const { currentTheme } = useTheme();
  const selectedFormat = ref<ExportFormat>("css-custom-properties");

  const availableFormats = computed<ExportFormat[]>(() =>
    EXPORT_FORMATTERS.map(formatter => formatter.format)
  );

  const formatLabels = computed<Record<ExportFormat, string>>(
    () =>
      Object.fromEntries(
        EXPORT_FORMATTERS.map(formatter => [formatter.format, formatter.label])
      ) as Record<ExportFormat, string>
  );

  const currentResult = computed<ExportResult | null>(() => {
    if (!currentTheme.value) return null;

    const palette = derivePalette(
      {
        id: currentTheme.value.seedId,
        displayName: currentTheme.value.seedLabel,
        background: {
          mode: "oklch",
          ...currentTheme.value.oklch.bg,
        },
        accent: {
          mode: "oklch",
          ...currentTheme.value.oklch.accent,
        },
        harmony: toHarmonyMode(currentTheme.value.harmonyId),
      },
      "Balanced"
    );

    const formatter = getFormatter(selectedFormat.value);
    return formatter.generate(palette);
  });

  async function copyCurrent(): Promise<boolean> {
    if (!currentResult.value) return false;
    try {
      await navigator.clipboard.writeText(currentResult.value.content);
      return true;
    } catch {
      return false;
    }
  }

  function downloadCurrent() {
    if (!currentResult.value) return;
    const blob = new Blob([currentResult.value.content], { type: currentResult.value.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = currentResult.value.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return {
    selectedFormat,
    availableFormats,
    formatLabels,
    currentResult,
    copyCurrent,
    downloadCurrent,
  };
}
