/** SHA256 byte baselines captured at W0 78933a38d (unchanged runtime from main 18e9ab630).
 * One fixed Ironclad board per screen, relabeled to exercise each character's existing routing.
 * Silent outcome statistics use the original W0 snapshot; other knowledge paths use missing fixtures.
 * This checks architecture, not other roles' game knowledge.
 */
import { createHash } from "node:crypto";
import { setExperienceForTests } from "../src/knowledge/experience.js";
import frozenSilentOutcomes from "./fixtures/v6-off-silent-outcome-stats.json";
import { afterEach, expect, it, vi } from "vitest";
import baselines from "./v6-off-baseline.json";
import { ask, board, choose, decide, env, planned, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { runConfigRow } from "../src/eye/run-config.js";
import { loadConfig } from "../src/core/config.js";
vi.mock("../src/knowledge/files.js", async original => ({ ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__v6_off_fixed__/${name}` }));
setupOneshotTests();
afterEach(() => { setExperienceForTests(null); setKnowledgeCharacter(null); vi.unstubAllEnvs(); vi.useRealTimers(); });
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const expected = baselines as Record<string, string>;
const cases = ["unset", "explicit_off", "off_with_all_subfeatures_requested"] as const;
for (const character of ["ironclad", "silent", "regent"]) {
  it.each(cases)(`${character} %s preserves question bytes, resolved action and run-config identity from W0`, setting => {
    // W0 captured these statistics; refreshed live metadata must not alter the byte contract.
    if (character === "silent") setExperienceForTests(null, frozenSilentOutcomes);
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-19T00:00:00.000Z"));
    setKnowledgeCharacter(character); vi.stubEnv("CHARACTER", character);
    const features = setting === "off_with_all_subfeatures_requested";
    vi.stubEnv("V6_BUILD", setting === "unset" ? undefined : "off");
    for (const kind of ["CARD", "POTION", "SHOP", "REST"]) vi.stubEnv(`V6_${kind}_DECIDER`, features ? "jev" : undefined);
    vi.stubEnv("V6_REFLEX", features ? "on" : undefined);
    for (const [file, key] of [["7b0d-f8-rest", "rest"], ["xljq-f5-reward", "reward"], ["u6ru-f22-shop", "open"]] as const) {
      const raw = board(file, key); Object.assign(raw["run"] as Raw, { character_id: character.toUpperCase(), character_name: character });
      const d = ask(decide(env(raw)));
      const resolved = file.includes("shop") ? planned(d, []) : choose(d, file.includes("reward") ? "skip" : "o0");
      expect(hash({ decision: d, resolved }), file).toBe(expected[`${character}:${file}`]);
    }
    const code = { commit: "0".repeat(40), code: "fixed", dirty: false, dirty_files: [], branch: "fixture", worktree: "fixture" };
    const fixedEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith("V6_")));
    const r = runConfigRow({ env: fixedEnv, code, config: loadConfig({ DECISION_LOG: "/__v6_off_fixed__/decisions.jsonl" }), brain: null, jevEnabled: false, mode: "play", knowledgeDir: "/__v6_fixed_missing__", processStarted: "2026-10-19T00:00:00.000Z" },
      { runId: "FIXTURE_RUN", ascension: 0, character: character.toUpperCase(), floor: 1 }, new Date("2026-10-19T00:00:00.000Z"));
    r.process.pid = 0;
    expect(hash(r), "run-config including config_sha").toBe(expected[`${character}:run-config`]);
  });
}
