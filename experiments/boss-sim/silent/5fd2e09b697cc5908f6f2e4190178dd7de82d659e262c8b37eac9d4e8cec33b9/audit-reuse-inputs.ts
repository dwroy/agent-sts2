/** Audit the full modeled card graph, including generated cards and random potion pools. */
import { readFileSync, writeFileSync } from "node:fs";
import { setKnowledgeCharacter, KNOWLEDGE_DIR, knowledgeFile } from "../../../agent/src/knowledge/files.js";
setKnowledgeCharacter("silent");
const { makeKnowledge } = await import("../../../agent/src/knowledge/index.js");
const { parseGameState } = await import("../../../agent/src/hand/mod/schema.js");
const { readMonsterDbJson } = await import("../../../agent/src/knowledge/monster-db.js");
const { bossOpening, loadMonsterDb } = await import("../../../agent/src/sim/boss-start.js");
const { normalizeCalibrationOpening } = await import("../../../agent/tools/boss-sim/calibration-board.js");
const { boardOf } = await import("../../../agent/tools/boss-sim/backtest-board.js");
const scratch = process.argv[2]!;
const knowledge = makeKnowledge(JSON.parse(readFileSync("/home/dw/Projects/agent-sts2/data/game-data.json", "utf8")).collections, "cache");
const mm = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "move-model.json"), "utf8"));
const db = readMonsterDbJson().monsters;
const monsterDb = loadMonsterDb();
const fights = readFileSync(`${scratch}/dataset/fights.jsonl`, "utf8").trim().split("\n").map(JSON.parse);
function upgrades(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(upgrades);
  const record = value as Record<string, unknown>;
  return Boolean(record.apotheosis) || record.special === "forge" || Object.values(record).some(upgrades);
}
const audit = fights.map((row: any) => {
  try {
    const raw = structuredClone(row.t1.state);
    const key = row.encounter.includes("CRUSHER") ? "KAISER_CRAB" : row.encounter.includes("KIN_PRIEST") ? "THE_KIN" : row.encounter.includes("QUEEN") ? "QUEEN" : row.encounter;
    const opening = bossOpening(key, row.asc, monsterDb, knowledge);
    if (!opening) throw new Error(`missing boss opening ${key}`);
    normalizeCalibrationOpening(raw, opening, monsterDb, row.asc);
    const board = boardOf(parseGameState(raw), knowledge, row.encounter, db, mm, { randomPotions: true });
    return { key: row.key, replay: upgrades(board.input), reason: "All modeled hands, piles, generated cards, and potion pools recursively checked for Apotheosis or Forge" };
  } catch (error) {
    return { key: row.key, replay: true, error: String(error) };
  }
});
writeFileSync(`${scratch}/reuse-input-audit.json`, JSON.stringify(audit, null, 1) + "\n");
console.log(JSON.stringify({ audited: audit.length, potentially_affected: audit.filter((r: any) => r.replay).length }));
