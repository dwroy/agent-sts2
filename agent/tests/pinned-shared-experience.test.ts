/** Fixed filesystem input reproduces a newly present shared file beside a historical replay. */
import { existsSync, readFileSync, statSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { historicalKnowledgeFs } from "./historical-knowledge-fs.js";
import { loadSharedExperience } from "../src/knowledge/shared-experience.js";

const calls = vi.hoisted(() => { vi.resetModules(); return { reads: 0 }; });
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { historicalKnowledgeFs } = await import("./historical-knowledge-fs.js");
  const shared = (path: unknown) => String(path).endsWith("/shared-experience.json");
  return historicalKnowledgeFs({
    ...fs,
    existsSync: (path) => shared(path) ? true : fs.existsSync(path),
    statSync: ((path: unknown, ...args: unknown[]) => shared(path)
      ? { mtimeMs: 0, size: 50 }
      : (fs.statSync as (...args: unknown[]) => unknown)(path, ...args)) as typeof fs.statSync,
    readFileSync: ((path: unknown, ...args: unknown[]) => {
      if (shared(path)) { calls.reads += 1; return JSON.stringify({ version: "fixed-present-file", entries: [] }); }
      return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
    }) as typeof fs.readFileSync,
  });
});

it("keeps shared lessons absent in a historical replay even when the checkout file exists", () => {
  expect(loadSharedExperience("/__historical_fixture__")).toEqual({ version: "无", entries: [] });
  expect(calls.reads).toBe(0);
  expect(() => statSync("/__historical_fixture__/common/shared-experience.json")).toThrow(/ENOENT/);
});

it("preserves every unrelated fixed filesystem operation", () => {
  const path = new URL("./silent-route-relic-evidence.json", import.meta.url);
  const fs = { existsSync, statSync, readFileSync } as typeof import("node:fs");
  const historical = historicalKnowledgeFs(fs);
  expect(historical.existsSync(path)).toBe(existsSync(path));
  expect(historical.statSync(path).size).toBe(statSync(path).size);
  expect(historical.readFileSync(path, "utf8")).toBe(readFileSync(path, "utf8"));
});
