import { defineConfig } from "@playwright/test";

const hosted = process.env.CRYPTO_TEST_HOSTED === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: hosted
      ? "node node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --port 3100 --inspector-port 0"
      : "node server/index.js",
    url: "http://127.0.0.1:3100",
    env: { PORT: "3100" },
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1080 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
