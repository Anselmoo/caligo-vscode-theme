import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Type mismatch between vite and vitest's bundled types can cause
  // a compile-time error. Narrow the plugin type with an explicit cast
  // to Vite's PluginOption to satisfy both runtimes.
  plugins: [vue() as unknown as import("vite").PluginOption],
  test: {
    globals: false,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "src/**/*.{test,spec}.ts",
      "tests/integration/**/*.test.ts",
      "tests/verification/**/*.test.ts",
      "tests/verification/**/*.ts",
    ],
    fileParallelism: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts", "src/vue-app/**/*.ts", "src/schema/**/*.ts"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/types/**",
        "src/vue-app/router.ts",
        "src/vue-app/main.ts",
        "src/vue-app/stores/themeStore.ts",
        // UI utility composables that are demo/analysis features
        "src/vue-app/composables/useUsableColors.ts",
        "src/vue-app/composables/useColorScience.ts",
        "src/vue-app/composables/useColorVariants.ts",
        "src/vue-app/composables/useContrastData.ts",
        "src/vue-app/composables/useScreenshots.ts",
        "src/vue-app/composables/useThemeAnalysis.ts",
        "src/index.ts",
        "dist/",
        "build/",
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 60,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src/vue-app", import.meta.url)),
      "@types": fileURLToPath(new URL("./src/vue-app/types", import.meta.url)),
      "@components": fileURLToPath(new URL("./src/vue-app/components", import.meta.url)),
      "@composables": fileURLToPath(new URL("./src/vue-app/composables", import.meta.url)),
      "@views": fileURLToPath(new URL("./src/vue-app/views", import.meta.url)),
      "@styles": fileURLToPath(new URL("./src/vue-app/styles", import.meta.url)),
    },
  },
});
