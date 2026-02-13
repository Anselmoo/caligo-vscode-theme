import { onMounted, ref } from "vue";

export interface ContrastPair {
  label: string;
  ratio: number;
  passes?: {
    aa?: boolean;
    aaa?: boolean;
  };
  aa?: boolean;
  aaa?: boolean;
}

export interface ContrastData {
  pairs: ContrastPair[];
  score: number;
  aaa: number;
  aa: number;
  total: number;
}

export interface ContrastDataMap {
  [themeKey: string]: ContrastData;
}

type ContrastWindow = Window & {
  __CALIGO_CONTRAST__?: ContrastDataMap;
};

export function useContrastData() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const contrastData = ref<ContrastDataMap>({});
  const isLoaded = ref(false);

  onMounted(async () => {
    const contrastWindow = window as ContrastWindow;
    // Try to load from window global first (if available from analysis.html)
    if (typeof window !== "undefined" && contrastWindow.__CALIGO_CONTRAST__) {
      contrastData.value = contrastWindow.__CALIGO_CONTRAST__;
      isLoaded.value = true;
      return;
    }

    // Otherwise try to load from generated manifest
    try {
      const response = await fetch(`${baseUrl}contrast-manifest.json`);
      if (response.ok) {
        contrastData.value = await response.json();
        isLoaded.value = true;
      }
    } catch (error) {
      console.warn("Failed to load contrast data:", error);
      // Fallback: use mock data or empty object
      contrastData.value = {};
      isLoaded.value = true;
    }
  });

  function getContrastForTheme(themeKey: string): ContrastData | null {
    return contrastData.value[themeKey] || null;
  }

  function getWorstRatio(pairs: ContrastPair[]): ContrastPair | null {
    if (!pairs || pairs.length === 0) return null;
    return pairs.slice().sort((a, b) => (a.ratio || 0) - (b.ratio || 0))[0];
  }

  return {
    contrastData,
    isLoaded,
    getContrastForTheme,
    getWorstRatio,
  };
}
