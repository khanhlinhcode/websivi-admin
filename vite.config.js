import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { buildSecurityHeaders } from "./security-headers.mjs";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "deployment-security-headers",
      generateBundle() {
        const env = loadEnv(mode, process.cwd(), "");
        this.emitFile({
          type: "asset",
          fileName: "_headers",
          source: buildSecurityHeaders(env.VITE_API_URL),
        });
      },
    },
  ],
  resolve: {
    alias: Object.fromEntries(["api", "assets", "component", "pages", "style", "utils"].map(
      (name) => [name, path.resolve(import.meta.dirname, "src", name)]
    )),
  },
  build: { outDir: "build" },
  test: { globals: true, environment: "jsdom", exclude: ["node_modules/**", "tests/e2e/**"] },
}));
