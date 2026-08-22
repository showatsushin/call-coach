import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/call-coach/",
  plugins: [react()],
  build: {
    outDir: "build-output",
    emptyOutDir: false,
    // Node 24 / Windows環境でnative minifierが異常終了するため、モックでは無効化する。
    minify: false,
    cssMinify: false,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
