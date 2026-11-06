import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL: process.env["SEARCHIVO_APP_URL"] ?? "http://127.0.0.1:4183" },
  webServer: process.env["SEARCHIVO_APP_URL"]
    ? []
    : [
        {
          command: "node scripts/serve.mjs dist/deploy/example 4183",
          url: "http://127.0.0.1:4183",
          reuseExistingServer: false,
        },
        {
          command: "node scripts/serve.mjs dist/website 4184",
          url: "http://127.0.0.1:4184",
          reuseExistingServer: false,
        },
      ],
  reporter: "list",
});
