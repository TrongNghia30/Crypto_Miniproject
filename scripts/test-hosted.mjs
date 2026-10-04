import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CRYPTO_TEST_HOSTED: "1",
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_WRITE_LOGS: "false",
    },
  },
);
process.exit(result.status ?? 1);
