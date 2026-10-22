import { computed, ref } from "vue";
import { EXPORT_FORMATTERS, getFormatter } from "../../export/formatter-registry.js";
import { sourceFromTheme } from "../../export/shared.js";
import type { ExportFormat, ExportResult } from "../../export/types.js";
import { useTheme } from "./useTheme.js";

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

    const formatter = getFormatter(selectedFormat.value);
    return formatter.generate(sourceFromTheme(currentTheme.value));
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
