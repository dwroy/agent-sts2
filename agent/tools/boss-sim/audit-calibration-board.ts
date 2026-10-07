/** Offline provenance audit for every replay opening. No simulation or model API. */
import { readFileSync, writeFileSync } from "node:fs";
import { setKnowledgeCharacter } from "../../src/knowledge/files.js";
import { normalizeCalibrationOpening } from "./calibration-board.js";
import { moveDamageAt } from "../../src/knowledge/monster-db.js";

setKnowledgeCharacter("silent");
const { bossOpening, loadMonsterDb } = await import("../../src/sim/boss-start.js");
const db = loadMonsterDb();
const rows = readFileSync(process.argv[2]!, "utf8").trim().split("\n").map((line) => JSON.parse(line) as {
  key: string; asc: number; encounter: string; t1: { state: Record<string, unknown> };
});
const audit = rows.map((row) => {
  const key = row.encounter.includes("CRUSHER") ? "KAISER_CRAB" : row.encounter.includes("KIN_PRIEST") ? "THE_KIN" : row.encounter.includes("QUEEN") ? "QUEEN" : row.encounter;
  const opening = bossOpening(key, row.asc, db);
  if (!opening) throw new Error(`missing ${row.key}`);
  const raw = structuredClone(row.t1.state);
  const source = normalizeCalibrationOpening(raw, opening, db, row.asc);
  const enemies = (raw["combat"] as { enemies: Array<{ enemy_id: string; intents: Array<{ damage?: number | null }> }> }).enemies;
  const changed = source.some((part, at) => {
    const hit = part["hit"] as { perHit: number } | null;
    return hit && enemies[at]!.intents.some((i) => i.damage != null) && part["shown"] !== hit.perHit;
  });
  return { key: row.key, source, needs_corrected_first_hit_replay: changed };
});
writeFileSync(process.argv[3]!, JSON.stringify(audit, null, 1) + "\n");
writeFileSync(process.argv[4]!, JSON.stringify(audit.filter((r) => r.needs_corrected_first_hit_replay).map((r) => r.key), null, 1) + "\n");
if (process.argv[5]) {
  const inputs = [...new Set(rows.map((r) => r.asc))].sort((a, b) => a - b).map((asc) => ({
    asc,
    monsters: [...new Set(audit.filter((r) => rows.find((row) => row.key === r.key)?.asc === asc)
      .flatMap((r) => r.source.map((part) => String(part["id"]))))].sort().map((id) => ({
        id, moves: Object.keys(db.monsters[id]?.moves ?? {}).sort().map((move) => ({ move, damage: moveDamageAt(db.monsters, id, move, asc) })),
      })),
  }));
  writeFileSync(process.argv[5], JSON.stringify(inputs, null, 1) + "\n");
}
console.error(`${audit.length} opening sources audited; ${audit.filter((r) => r.needs_corrected_first_hit_replay).length} require corrected first-hit replay`);
