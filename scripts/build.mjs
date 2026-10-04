import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const build = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "deploy",
    "--dry-run",
    "--outdir",
    "dist/server",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_WRITE_LOGS: "false",
    },
  },
);
if (build.status !== 0) process.exit(build.status || 1);
mkdirSync("dist/client", { recursive: true });
cpSync("public", "dist/client", { recursive: true });
mkdirSync("dist/.openai", { recursive: true });
cpSync(".openai/hosting.json", "dist/.openai/hosting.json");
const config = JSON.parse(readFileSync("wrangler.json", "utf8"));
config.main = "index.js";
config.assets.directory = "../client";
writeFileSync(
  "dist/server/wrangler.json",
  JSON.stringify(config, null, 2) + "\n",
);
