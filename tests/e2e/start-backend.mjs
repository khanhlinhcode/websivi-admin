import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const backendDir = process.env.BACKEND_DIR || path.resolve("../SVC01072023BE/SVC01072023BE");
const php = process.env.E2E_PHP_BIN || "php";
const runtime = mkdtempSync(path.join(tmpdir(), "sivi-e2e-"));
const frontendPort = process.env.E2E_FRONTEND_PORT || "5176";
const backendPort = process.env.E2E_BACKEND_PORT || "8003";
const storePort = process.env.E2E_STOREFRONT_PORT || "5177";
const cloudinaryPort = process.env.E2E_CLOUDINARY_PORT || "8004";
const frontend = "http://127.0.0.1:" + frontendPort;
const mysql = process.env.E2E_DB_CONNECTION === "mysql";
if (process.env.E2E_DB_CONNECTION && !["mysql", "sqlite"].includes(process.env.E2E_DB_CONNECTION)) {
  throw new Error("E2E only supports a dedicated SQLite or MySQL test database.");
}
const database = mysql ? process.env.E2E_DB_DATABASE : path.join(runtime, "database.sqlite");
const databasePort = process.env.E2E_DB_PORT || "3307";
if (mysql && (!/^sivi_e2e_[a-z0-9_]+$/.test(database || "") || databasePort === "3306")) {
  throw new Error("Refusing E2E migration: use a sivi_e2e_* database on an isolated MySQL port.");
}
if (!mysql) writeFileSync(database, "");
const env = {
  ...process.env,
  APP_ENV: "testing",
  APP_DEBUG: "false",
  APP_KEY: "base64:" + randomBytes(32).toString("base64"),
  APP_URL: "http://127.0.0.1:" + backendPort,
  APP_CONFIG_CACHE: path.join(runtime, "config.php"),
  APP_ROUTES_CACHE: path.join(runtime, "routes.php"),
  DB_URL: "",
  DB_CONNECTION: mysql ? "mysql" : "sqlite",
  DB_DATABASE: database,
  DB_HOST: "127.0.0.1",
  DB_PORT: databasePort,
  DB_USERNAME: mysql ? process.env.E2E_DB_USERNAME || "root" : "",
  DB_PASSWORD: mysql ? process.env.E2E_DB_PASSWORD || "" : "",
  SESSION_DRIVER: "database",
  SESSION_COOKIE: "sivi_e2e_session",
  SESSION_DOMAIN: "",
  SESSION_SECURE_COOKIE: "false",
  CACHE_STORE: "database",
  CACHE_PREFIX: "sivi_e2e_" + path.basename(runtime).replace(/[^A-Za-z0-9]/g, "_") + "_",
  QUEUE_CONNECTION: "database",
  MAIL_MAILER: "array",
  LOG_CHANNEL: "stderr",
  CORS_ALLOWED_ORIGINS: frontend + ",http://127.0.0.1:" + storePort,
  SANCTUM_STATEFUL_DOMAINS: "127.0.0.1:" + frontendPort + ",127.0.0.1:" + storePort,
  FRONTEND_URL: frontend,
  AI_CHAT_DRIVER: "ollama",
  AI_CHAT_BASE_URL: "http://127.0.0.1:11434",
  AI_CHAT_MODEL: process.env.E2E_AI_MODEL || "missing-e2e-model",
  AI_CHAT_TIMEOUT: "20",
  BCRYPT_ROUNDS: "4",
  SEED_ADMIN_ENABLED: "false",
  PHP_CLI_SERVER_WORKERS: "4",
  CLOUDINARY_API_BASE_URL: "http://127.0.0.1:" + cloudinaryPort,
  CLOUDINARY_CLOUD_NAME: "e2e-cloud",
  CLOUDINARY_API_KEY: "e2e-key",
  CLOUDINARY_API_SECRET: "e2e-secret",
};
const multipartField = (body, name) => body.match(new RegExp(`name="${name}"[\\s\\S]*?\\r\\n\\r\\n([^\\r\\n]+)`))?.[1];
const cloudinaryServer = createServer((request, response) => {
  const chunks = [];
  request.on("data", chunk => chunks.push(chunk));
  request.on("end", () => {
    if (request.method === "GET" && request.url?.startsWith("/assets/")) {
      response.setHeader("Content-Type", "image/png");
      response.end(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
      return;
    }

    const body = Buffer.concat(chunks).toString("latin1");
    const isDestroy = request.url?.endsWith("/image/destroy");
    const form = isDestroy ? new URLSearchParams(body) : null;
    const field = name => form?.get(name) || multipartField(body, name);
    const publicId = field("public_id");
    const timestamp = field("timestamp");
    const apiKey = field("api_key");
    const signature = field("signature");
    const signaturePayload = `${isDestroy ? "invalidate=true&" : ""}public_id=${publicId}&timestamp=${timestamp}e2e-secret`;
    const validSignature = signature === createHash("sha1").update(signaturePayload).digest("hex");
    response.setHeader("Content-Type", "application/json");

    if (apiKey !== "e2e-key" || !publicId || !timestamp || !validSignature || body.includes("e2e-secret")) {
      response.statusCode = 401;
      response.end(JSON.stringify({ error: { message: "Invalid E2E Cloudinary signature" } }));
      return;
    }

    if (request.url?.endsWith("/image/upload") && publicId) {
      response.end(JSON.stringify({
        secure_url: `http://127.0.0.1:${cloudinaryPort}/assets/${publicId}.png`,
        public_id: publicId,
      }));
      return;
    }

    if (request.url?.endsWith("/image/destroy") && publicId) {
      response.end(JSON.stringify({ result: "ok" }));
      return;
    }

    response.statusCode = 400;
    response.end(JSON.stringify({ error: { message: "Invalid E2E Cloudinary request" } }));
  });
});
await new Promise((resolve, reject) => {
  cloudinaryServer.once("error", reject);
  cloudinaryServer.listen(Number(cloudinaryPort), "127.0.0.1", resolve);
});
const inspect = spawnSync(php, ["-r", [
  'require "vendor/autoload.php";',
  '$app = require "bootstrap/app.php";',
  '$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();',
  '$c = config("database.default"); $d = config("database.connections.".$c);',
  'echo json_encode(["environment"=>app()->environment(),"connection"=>$c,"database"=>$d["database"],"host"=>$d["host"]??null,"port"=>$d["port"]??null]);',
].join("")], { cwd: backendDir, env, encoding: "utf8" });
if (inspect.status !== 0) throw new Error("Laravel test boot failed: " + inspect.stderr);
const actual = JSON.parse(inspect.stdout);
if (actual.environment !== "testing" || actual.connection !== env.DB_CONNECTION ||
    actual.database !== database || (mysql && (actual.host !== "127.0.0.1" || String(actual.port) !== databasePort))) {
  throw new Error("Refusing migration: resolved Laravel configuration differs from the isolated test target.");
}
console.log("Verified Laravel E2E database:", JSON.stringify(actual));
for (const args of [["artisan", "migrate", "--force"], ["artisan", "db:seed", "--class=Tests\\E2ESeeder", "--force"]]) {
  const result = spawnSync(php, args, { cwd: backendDir, env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
const server = spawn(php, ["artisan", "serve", "--host=127.0.0.1", "--port=" + backendPort, "--no-reload"], {
  cwd: backendDir, env, stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  server.kill(signal);
  cloudinaryServer.close();
});
server.on("exit", (code) => cloudinaryServer.close(() => process.exit(code || 0)));
