import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// Vue-powered static site (GH Pages friendly)
export default defineConfig(() => {
  // Always use VITE_BASE if set (from CI or manual override)
  // Otherwise default to "/" for local dev
  const base = process.env.VITE_BASE || "/";

  return {
    base,
    plugins: [vue()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src/vue-app", import.meta.url)),
        "@components": fileURLToPath(new URL("./src/vue-app/components", import.meta.url)),
        "@composables": fileURLToPath(new URL("./src/vue-app/composables", import.meta.url)),
        "@views": fileURLToPath(new URL("./src/vue-app/views", import.meta.url)),
        "@styles": fileURLToPath(new URL("./src/vue-app/styles", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      fs: {
        // Allow imports from repo root for theme data
        allow: [".."],
      },
    },
    preview: {
      port: 4173,
    },
    build: {
      outDir: resolve(__dirname, "dist"),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
        output: {
          manualChunks: {
            "vue-vendor": ["vue", "vue-router"],
            "color-utils": ["culori"],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
