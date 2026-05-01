import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1, // tests share Neon dev DB; serial avoids cross-file row pollution
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NODE_OPTIONS: "--dns-result-order=ipv4first" },  // works around Neon DNS lookup issue on this Windows shell
  },
  reporter: [["list"]],
});
