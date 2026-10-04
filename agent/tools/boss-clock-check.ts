/**
 * Boss-clock sanity check: the deck damage estimate on each run's last board before its act-2 boss,
 * next to the damage a turn the post-mortem measured. Usage: npx tsx tools/boss-clock-check.ts RUN:actual ...
 */
import { createReadStream, readFileSync, statSync } from "node:fs";
import { createInterface } from "node:readline";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { damageGap } from "../src/strategy/boss-clock.js";
import { fromRoot } from "../src/core/paths.js";

const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const want = new Map(process.argv.slice(2).map((arg) => arg.split(":") as [string, string]));
const last = new Map<string, Record<string, unknown>>();
const size = statSync(fromRoot("logs/states.jsonl")).size;
const reader = createInterface({ input: createReadStream(fromRoot("logs/states.jsonl"), { start: Math.max(0, size - 1500 * 1024 * 1024) }) });
for await (const line of reader) {
  const run = /\\"run\\":\\"([A-Z0-9]+)\\"/.exec(line.slice(0, 3000))?.[1];
  if (!run || !want.has(run)) continue;
  const floor = Number(/"floor":(\d+)/.exec(line)?.[1] ?? 0);
  if (floor < 30 || floor > 32) continue;
  try {
    last.set(run, (JSON.parse(line) as { state: Record<string, unknown> }).state);
  } catch {
    // torn line
  }
}
for (const [run, actual] of want) {
  const raw = last.get(run);
  const gap = raw ? damageGap(parseGameState(raw), knowledge) : null;
  console.log(run, "actual", actual, "->", gap ? `${gap.boss} need ${gap.need} deck ${gap.deck} gap ${gap.gap}` : "no board");
}
