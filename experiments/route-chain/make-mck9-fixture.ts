/** Builds tests/logged-states/route-rest/mck9-f32-rest.json: MCK9SMSK40ZY's F32 REST board and the map remembered from F31. */
import { readFileSync, readSync, openSync, writeFileSync } from "node:fs";
import { parseGameState } from "../../agent/src/mod/schema.js";
import { createScreenMemory } from "../../agent/src/project/types.js";
import { rememberChosenNode, rememberMap } from "../../agent/src/screens/rest.js";

const fd = openSync("logs/states.jsonl", "r");
const at = (off: number, len: number) => {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return JSON.parse(buffer.toString("utf8")) as { ts: string; state: Record<string, unknown> };
};
const map = at(4308872120, 43728);
const rest = at(4308915848, 24231);
const memory = createScreenMemory("MAP");
const mapState = parseGameState(map.state);
rememberMap(memory, mapState);
rememberChosenNode(memory, mapState, { action: "choose_map_node", option_index: 0 });
writeFileSync(
  "tests/logged-states/route-rest/mck9-f32-rest.json",
  `${JSON.stringify(
    {
      source: `MCK9SMSK40ZY F32 ${rest.ts} rest/plan (A8; the map remembered from the F31 MAP state ${map.ts}, its move to r14c4)`,
      decision: { label: "rest/plan", decider: "deepseek", chosen: "o1 SMITH (欺凌)", rationale: "DeepSeek decided o1:c17: Pantograph caps heal to +12 HP (77 vs 89 entry, both ≥80%); boss is a damage race — upgrade Bully" },
      state: rest.state,
      screenMemory: { lastMap: memory.lastMap },
    },
    null,
    1,
  )}\n`,
);
