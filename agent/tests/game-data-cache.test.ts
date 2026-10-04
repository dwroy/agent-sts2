/**
 * The game-data cache (knowledge/index.ts): a fake mod's or an empty catalogue never replaces the project's
 * data/game-data.json (2026-10-04 20:00: a doctor run against tools/fake-mod.mjs did), and GAME_DATA_DIR moves the cache.
 */
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DATA_DIR } from "../src/core/paths.js";
import { cacheWriteRefusal, gameDataDir, loadKnowledge, type KnowledgeFile } from "../src/knowledge/index.js";
import type { ModClient } from "../src/hand/mod/client.js";

const catalogue = (mod: string, cards: unknown[]): KnowledgeFile => ({ mod_version: mod, fetched_at: "x", collections: { cards } });
const card = { id: "STRIKE_R", name: "Strike", type: "Attack", rarity: "Basic", cost: 1 };
const projectCache = (): string | null => (existsSync(join(DATA_DIR, "game-data.json")) ? readFileSync(join(DATA_DIR, "game-data.json"), "utf8") : null);

describe("game-data cache", () => {
  it("never writes an empty catalogue, nor a fake mod's into the project's data/", () => {
    expect(cacheWriteRefusal(catalogue("0.16.2", []), "/tmp/x")).toMatch(/no cards/);
    expect(cacheWriteRefusal(catalogue("0.13.0-fake", [card]), DATA_DIR)).toMatch(/fake mod/);
    expect(cacheWriteRefusal(catalogue("0.13.0-fake", [card]), "/tmp/x")).toBeNull();
    expect(cacheWriteRefusal(catalogue("0.16.2", [card]), DATA_DIR)).toBeNull();
  });

  it("GAME_DATA_DIR moves the cache; a fake mod's empty catalogue writes nothing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "game-data-"));
    expect(gameDataDir({}, { GAME_DATA_DIR: dir } as NodeJS.ProcessEnv)).toBe(dir);
    expect(gameDataDir({}, {} as NodeJS.ProcessEnv)).toBe(DATA_DIR);
    const before = projectCache();
    const empty = { collection: async () => [] } as unknown as ModClient;
    await loadKnowledge(empty, { modVersion: "0.13.0-fake", cacheDir: dir, refresh: true });
    expect(existsSync(join(dir, "game-data.json"))).toBe(false);
    const full = { collection: async (name: string) => (name === "cards" ? [card] : []) } as unknown as ModClient;
    await loadKnowledge(full, { modVersion: "0.13.0-fake", cacheDir: dir, refresh: true });
    expect((JSON.parse(readFileSync(join(dir, "game-data.json"), "utf8")) as KnowledgeFile).mod_version).toBe("0.13.0-fake");
    // The project's cache is untouched by all of it.
    expect(projectCache()).toBe(before);
  });
});
