import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
const adminPort = process.env.E2E_FRONTEND_PORT || "5176";
const storePort = process.env.E2E_STOREFRONT_PORT || "5177";
const backendPort = process.env.E2E_BACKEND_PORT || "8003";
const cloudinaryPort = process.env.E2E_CLOUDINARY_PORT || "8004";
const ports = [adminPort, storePort, backendPort, cloudinaryPort];
if (ports.some(p => !/^\d+$/.test(p) || Number(p) < 1024 || Number(p) > 65535 || ["8000", "5173", "5174"].includes(p)) || new Set(ports).size !== 4) throw new Error("Use separate E2E ports, not local application ports.");
const admin = "http://127.0.0.1:" + adminPort;
const store = "http://127.0.0.1:" + storePort;
const api = "http://127.0.0.1:" + backendPort;
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: { baseURL: admin, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    { command: "node tests/e2e/start-backend.mjs", url: api + "/up", timeout: 120_000, reuseExistingServer: false },
    { command: "npm run dev -- --port " + adminPort, url: admin, env: { VITE_API_URL: api + "/api", VITE_STOREFRONT_URL: store }, reuseExistingServer: false },
    { command: "npm run dev -- --host 127.0.0.1 --strictPort --port " + storePort, cwd: process.env.STOREFRONT_DIR || path.resolve("../websivi"), url: store, env: { VITE_API_URL: api + "/api", VITE_ANALYTICS_ENABLED: "true" }, reuseExistingServer: false },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
