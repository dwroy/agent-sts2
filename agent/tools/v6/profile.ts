/** Single-fight timing from actual frozen boards; absent character/act inputs remain unknown. */
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { PROJECT_ROOT, KNOWLEDGE_DIR } from "../../src/core/paths.js";
import { asRecord, str } from "../../src/core/util/json.js";
import { setKnowledgeCharacter, knowledgeFile } from "../../src/knowledge/files.js";
import { makeKnowledge } from "../../src/knowledge/index.js";
import { readMonsterDbJson, type MonsterDb } from "../../src/knowledge/monster-db.js";
import type { MoveModelData } from "../../src/reflex/rollout.js";
import { parseGameState } from "../../src/hand/mod/schema.js";
import { syntheticBossStart } from "../../src/sim/boss-start.js";
import { bossLinesOptions } from "../../src/sim/boss-lines.js";
import { SerialDeckRunner } from "../../src/sim/build-sim-pool.js";
import { frozenRecord, type FrozenRange } from "./frozen-input.js";

const args = process.argv.slice(2), opts = new Map<string, string>();
for (let i = 0; i < args.length; i += 2) {
  if (!["--root", "--evidence", "--out"].includes(args[i]!) || !args[i + 1] || opts.has(args[i]!)) throw new Error("profile.ts --evidence DIR --out NEW_DIR [--root DIR]");
  opts.set(args[i]!, args[i + 1]!);
}
const root = resolve(opts.get("--root") ?? PROJECT_ROOT), out = resolve(opts.get("--out") ?? "");
if (!opts.has("--evidence") || !opts.has("--out") || existsSync(out) || !out.startsWith(resolve(PROJECT_ROOT, ".artifacts") + "/")) throw new Error("new output must be in this worktree's .artifacts");
const scopes = ["ironclad", "silent", "regent", "defect", "necrobinder"], hashes: Record<string, string> = {};
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const selected = new Map<string, { raw: Record<string, unknown>; source: unknown }>();
function candidate(raw: Record<string, unknown>, source: unknown, expected?: string) {
  const r = asRecord(raw["run"]), character = str(r["character_id"]).toLowerCase(), act = Number(r["act_id"]) + 1;
  if (!scopes.includes(character) || expected && expected !== character || ![1, 2, 3].includes(act)
    || raw["in_combat"] !== true || !r["boss_id"] || !(Number(r["current_hp"]) > 0)) return;
  const key = `${character}:${act}`; if (!selected.has(key)) selected.set(key, { raw, source });
}
function fixtures(dir: string) {
  for (const f of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, f.name); if (f.isDirectory()) { fixtures(path); continue; }
    if (!f.isFile() || !f.name.endsWith(".json") || f.name === "game-data.json") continue;
    const bytes = readFileSync(path), x = asRecord(JSON.parse(bytes.toString("utf8")));
    candidate(asRecord(x["state"]), { path, sha256: sha(bytes), kind: "logged_fixture" });
  }
}
fixtures(join(PROJECT_ROOT, "agent/tests/logged-states"));
const framesPath = join(resolve(opts.get("--evidence")!), "state-frames.jsonl"), frameHash = createHash("sha256");
const stream = createReadStream(framesPath); stream.on("data", chunk => frameHash.update(chunk));
for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
  if (!line) continue;
  const f = JSON.parse(line) as { act_id: string; screen: string; in_combat: boolean; turn: number; source: FrozenRange };
  if (!f.in_combat || f.screen !== "COMBAT" || f.turn !== 1 || selected.has(`silent:${Number(f.act_id) + 1}`)) continue;
  candidate(asRecord(asRecord(frozenRecord(join(root, "logs"), f.source))["state"]), f.source, "silent");
}
hashes[framesPath] = frameHash.digest("hex");
const catalogPath = join(root, "data/game-data.json"), bytes = readFileSync(catalogPath), catalog = JSON.parse(bytes.toString("utf8"));
hashes[catalogPath] = sha(bytes);
const knowledge = makeKnowledge(catalog.collections, "cache"), runner = new SerialDeckRunner(), rows: unknown[] = [];
const enabled = bossLinesOptions.enabled; bossLinesOptions.enabled = false;
try {
  for (const character of scopes) for (const act of [1, 2, 3]) {
    const board = selected.get(`${character}:${act}`);
    if (!board) { rows.push({ character, act, status: "unknown", reason: "no_own_frozen_combat_board" }); continue; }
    setKnowledgeCharacter(character);
    try {
      const state = parseGameState(board.raw), parsed = readMonsterDbJson(KNOWLEDGE_DIR) as Partial<MonsterDb>;
      const mm = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "move-model.json"), "utf8")) as MoveModelData;
      const start = syntheticBossStart(state, knowledge, str(state.run!.raw["boss_id"]), state.run!.current_hp!, {
        db: { bosses: parsed.bosses ?? {}, encounters: parsed.encounters ?? {}, monsters: parsed.monsters ?? {} }, mm });
      const samples: unknown[] = [];
      for (let i = 0; i < 3; i++) {
        const began = performance.now(), result = await runner.run({ base: start.input, decks: [{}], orders: [null], samples: 1, seed: 61019 + i, deadlineMs: 1000 });
        const sample = result.outcomes[0]?.[0]?.[0];
        samples.push({ elapsed_ms: performance.now() - began, completed: !!sample && !sample.capped && !sample.timeUp, timed_out: result.timedOut,
          turns: sample?.turns ?? null });
      }
      rows.push({ character, act, ascension: state.run!.ascension, status: "measured", source: board.source, samples,
        labels: ["actual_held_deck_conditional_current_hp", "synthetic_opening_partial_model", "single_fight_serial_block_can_overrun_deadline"] });
    } catch (e) { rows.push({ character, act, status: "unknown", source: board.source, reason: String(e) }); }
  }
} finally { bossLinesOptions.enabled = enabled; }
mkdirSync(out);
writeFileSync(join(out, "profile.json"), JSON.stringify({ schema: "v6-fight-profile-v1", generated: new Date().toISOString(), input_sha256: hashes,
  rows, recommendation: { offline_workers: 3, live_workers: null, reason: "do_not_tune_live_pool_from_missing_character_or_ascension_coverage" } }, null, 2) + "\n");
process.stdout.write(`profile: ${out}/profile.json\n`);
