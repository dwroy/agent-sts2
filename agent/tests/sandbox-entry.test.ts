import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { resolveConfig } from "vite";
import { expect, it } from "vitest";

it("Vite disables automatic dotenv loading for fixed-data tests in a live checkout", async () => {
  const config = await resolveConfig({ configFile: resolve("vitest.config.ts") }, "serve", "test");
  expect(config.envDir).toBe(false);
});

it("the sandbox entry remains offline and selects its own package when sourced", () => {
  const script = readFileSync("tools/test-sandbox.sh", "utf8");
  expect(script).toContain('dirname "${BASH_SOURCE[0]}"');
  expect(script).toContain("export npm_config_offline=true");
  expect(script.indexOf("npm_config_offline=true")).toBeLessThan(script.indexOf("npx tsc"));
});
