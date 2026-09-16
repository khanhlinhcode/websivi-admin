import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: Object.fromEntries(["api", "assets", "component", "pages", "style", "utils"].map(
      (name) => [name, path.resolve(import.meta.dirname, "src", name)]
    )),
  },
  build: { outDir: "build" },
  test: { globals: true, environment: "jsdom", exclude: ["node_modules/**", "tests/e2e/**"] },
});
