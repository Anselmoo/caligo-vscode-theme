import { computed, ref } from "vue";
import { getFormatter } from "../../export/formatter-registry.js";
import type { ExportFormat, ExportResult } from "../../export/types.js";
import type { DerivedPalette } from "../../lib/palette.js";
import { useTheme } from "./useTheme.js";

function toDerivedPalette(
  theme: NonNullable<ReturnType<typeof useTheme>["currentTheme"]["value"]>
): DerivedPalette {
  const accent = { mode: "oklch" as const, ...theme.oklch.accent };
  const bg = { mode: "oklch" as const, ...theme.oklch.bg };
  const fg = { mode: "oklch" as const, ...theme.oklch.fg };

  return {
    seed: {
      id: theme.seedId,
      displayName: theme.seedLabel,
      background: bg,
      accent,
    },
    mode: "Balanced",
    debug: {
      oklch: {
        bg0: bg,
        bg1: bg,
        bg2: bg,
        fg0: fg,
        fg1: fg,
        fgMuted: fg,
        accent,
        accentSoft: accent,
        accentMuted: accent,
        accentSubtle: accent,
        hueRed: accent,
        hueOrange: accent,
        hueYellow: accent,
        hueGreen: accent,
        hueCyan: accent,
        hueBlue: accent,
        huePurple: accent,
        border: bg,
        selectionBase: accent,
      },
      selectionAlpha: 0.24,
      harmonyMode: "none",
      syntaxStyle: "balanced",
      contrastTarget: "WCAG-AA",
      chromaMultiplier: 1,
      lightnessBoost: 0,
    },
    bg0: theme.colors.bg0,
    bg1: theme.colors.bg1,
    bg2: theme.colors.bg2,
    fg0: theme.colors.fg0,
    fg1: theme.colors.fg1,
    fgMuted: theme.colors.fgMuted,
    accent: theme.colors.accent,
    accentSoft: theme.colors.accent,
    accentMuted: theme.colors.accent,
    accentSubtle: theme.colors.accent,
    hueRed: theme.colors.error,
    hueOrange: theme.colors.keywords,
    hueYellow: theme.colors.keywords,
    hueGreen: theme.colors.functions,
    hueCyan: theme.colors.strings,
    hueBlue: theme.colors.types,
    huePurple: theme.colors.decorator,
    semantic: {
      debug: {
        error: accent,
        errorMuted: accent,
        warning: accent,
        warningMuted: accent,
        success: accent,
        successMuted: accent,
        info: accent,
        infoMuted: accent,
      },
      error: theme.colors.error,
      errorMuted: theme.colors.error,
      warning: theme.colors.keywords,
      warningMuted: theme.colors.keywords,
      success: theme.colors.strings,
      successMuted: theme.colors.strings,
      info: theme.colors.accent,
      infoMuted: theme.colors.accent,
    },
    harmony: {
      mode: "none",
      harmonyHues: [accent.h],
      strings: theme.colors.strings,
      keywords: theme.colors.keywords,
      functions: theme.colors.functions,
      types: theme.colors.types,
      variables: theme.colors.decorator,
      constants: theme.colors.decorator,
      numbers: theme.colors.keywords,
      decorators: theme.colors.decorator,
      regexp: theme.colors.keywords,
      comments: theme.colors.decorator,
      attributes: theme.colors.types,
      classes: theme.colors.types,
      interfaces: theme.colors.types,
      namespaces: theme.colors.types,
      operators: theme.colors.keywords,
      punctuation: theme.colors.fgMuted,
      support: theme.colors.functions,
      storage: theme.colors.keywords,
      tags: theme.colors.keywords,
      invalid: theme.colors.error,
    },
    border: theme.colors.fgMuted,
    selection: theme.colors.accent,
  } as unknown as DerivedPalette;
}

export function useExport() {
  const { currentTheme } = useTheme();
  const selectedFormat = ref<ExportFormat>("css-custom-properties");

  const availableFormats = computed<ExportFormat[]>(() => [
    "css-custom-properties",
    "css-oklch",
    "scss-variables",
    "tailwind-config",
    "design-tokens-w3c",
    "json-flat",
    "json-grouped",
  ]);

  const currentResult = computed<ExportResult | null>(() => {
    if (!currentTheme.value) return null;
    const formatter = getFormatter(selectedFormat.value);
    return formatter.generate(toDerivedPalette(currentTheme.value));
  });

  async function copyCurrent(): Promise<boolean> {
    if (!currentResult.value) return false;
    await navigator.clipboard.writeText(currentResult.value.content);
    return true;
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
    currentResult,
    copyCurrent,
    downloadCurrent,
  };
}
