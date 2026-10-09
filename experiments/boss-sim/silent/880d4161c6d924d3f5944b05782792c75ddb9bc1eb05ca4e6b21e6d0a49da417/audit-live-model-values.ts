/** Compare the frozen boss values with the preserved live knowledge refresh. */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [root, dataset, output] = process.argv.slice(2);
const moduleAt = (path: string) => import(pathToFileURL(`${root}/${path}`).href);
const files = await moduleAt("agent/src/knowledge/files.ts");
files.setKnowledgeCharacter("silent");
const start = await moduleAt("agent/src/sim/boss-start.ts");
const model = await moduleAt("agent/src/knowledge/monster-db.ts");
const calibration = await moduleAt("agent/tools/boss-sim/calibration-board.ts");
const rollout = await moduleAt("agent/src/reflex/rollout-live.ts");
const mm = JSON.parse(readFileSync(files.knowledgeFile(files.KNOWLEDGE_DIR, "move-model.json"), "utf8"));
const db = start.loadMonsterDb();
const fights = readFileSync(dataset!, "utf8").trim().split("\n").map(JSON.parse);
const rows = fights.map((row: any) => {
  const boss = row.encounter.includes("CRUSHER") ? "KAISER_CRAB" : row.encounter.includes("KIN_PRIEST") ? "THE_KIN" : row.encounter.includes("QUEEN") ? "QUEEN" : row.encounter;
  const opening = start.bossOpening(boss, row.asc, db);
  const raw = structuredClone(row.t1.state);
  const sources = calibration.normalizeCalibrationOpening(raw, opening, db, row.asc);
  const moves = opening.parts.map((part: any) => ({id: part.id,
    moves: Object.keys(db.monsters[part.id]?.moves ?? {}).sort().map(move => ({move, damage:model.moveDamageAt(db.monsters, part.id, move, row.asc)}))}));
  const tables = opening.parts.map((part: any) => ({id:part.id, table:rollout.enemyTable(part.id,row.asc,db.monsters,mm)}));
  return {key:row.key, boss, asc:row.asc, opening, normalized_state:raw, sources, moves, tables};
});
writeFileSync(output!, JSON.stringify(rows) + "\n");
console.log(JSON.stringify({character:"silent", audited:rows.length}));
