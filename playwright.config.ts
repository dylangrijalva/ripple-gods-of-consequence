import { defineConfig } from "@playwright/test";

const liveURL = process.env.GAME_URL;
const localURL = "http://127.0.0.1:4198";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.e2e.ts",
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: liveURL || localURL,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }
  },
  webServer: liveURL ? undefined : {
    command: "bun server/index.ts",
    env: { PORT: "4198" },
    url: localURL + "/healthz"
  }
});
