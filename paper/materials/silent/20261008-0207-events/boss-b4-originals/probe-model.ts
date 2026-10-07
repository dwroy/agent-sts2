import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enemyTable, type MonsterMoves } from "../../../agent/src/reflex/rollout-live.js";
import type { MoveModelData } from "../../../agent/src/reflex/rollout.js";

const out = dirname(fileURLToPath(import.meta.url));
const root = join(out, "../../..");
const db = (JSON.parse(readFileSync(join(root, "knowledge/common/monster-db.json"), "utf8")) as { monsters: MonsterMoves }).monsters;
const mm = JSON.parse(readFileSync(join(root, "knowledge/common/move-model.json"), "utf8")) as MoveModelData;
const tables = Object.fromEntries([0, 1, 2, 6, 7, 10].map((asc) => [asc, enemyTable("THE_INSATIABLE", asc, db, mm)]));
writeFileSync(join(out, "target-model-tables.json"), JSON.stringify(tables, null, 1) + "\n");
