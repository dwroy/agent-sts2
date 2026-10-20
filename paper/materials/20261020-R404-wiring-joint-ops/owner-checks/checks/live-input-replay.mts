import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const root = "/home/dw/Projects/agent-sts2", live = `${root}/.worktrees/live`, candidate = `${root}/.worktrees/v6-r404-card-provider-wiring-20261020`;
process.env.V6_BUILD = "on";
process.env.V6_CARD_DECIDER = "jev";
const load = (file: string) => import(pathToFileURL(file).href);
const old = await load(`${live}/agent/src/v6/projection-input.ts`);
const next = await load(`${candidate}/agent/src/v6/projection-input.ts`);
const { makeKnowledge } = await load(`${live}/agent/src/knowledge/index.ts`);
const { parseGameState } = await load(`${live}/agent/src/hand/mod/schema.ts`);
const { createScreenMemory } = await load(`${live}/agent/src/memory/types.ts`);
const { buildRunBrief } = await load(`${live}/agent/src/memory/run-brief.ts`);
const sha = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
const historyPath = `${live}/knowledge/characters/silent/v6-history.json`, before = sha(historyPath);
const cached = JSON.parse(readFileSync(`${live}/data/game-data.json`, "utf8"));
const knowledge = makeKnowledge(cached.collections, "cache");
const frozen = JSON.parse(readFileSync(`${candidate}/agent/tests/logged-states/v6-r404-card-rewards.json`, "utf8"));
const rows = [];
const liveInputs = new Map();
for (const floor of [2, 19]) for (const [name, source] of [["live", old], ["candidate", next]] as const) {
  const state = parseGameState(structuredClone(frozen.states[`f${floor}-reward`]));
  const env = { state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory(state.screen),
    thresholds: {act:0.5,strong:0.8},runStart:"auto",characterPreference:null,allowFtueModals:false,strictJev:true,shopDiscardPotions:[] };
  const start = performance.now();
  const input = await source.v6ProjectionInputs(`${live}/knowledge`)(env, "pick");
  if (name === "live") liveInputs.set(floor, input);
  const output = input?.factory.create(input.situation);
  rows.push({floor, source:name, elapsed_ms: performance.now()-start, visibleBosses:input?.situation.visibleBosses??null,
    status:output?.status??"no_input", reason:output?.reason??null,
    targets:output?.status==="ready"?output.request.targets.map((t: any)=>({id:t.id,act:t.act,floor:t.floor,boss:t.boss})):[]});
  if (name === "candidate" && input) {
    const liveFactory = liveInputs.get(floor).factory.create(input.situation);
    rows.push({floor,source:"live_factory_with_candidate_input",status:liveFactory.status,
      targets:liveFactory.status==="ready"?liveFactory.request.targets.map((t:any)=>({id:t.id,act:t.act,floor:t.floor,boss:t.boss})):[],
      reason:liveFactory.reason??null});
  }
}
const after=sha(historyPath);
const result={live_head:"048a9713bd4be09ad5f6d3f6131e8b729f51aece",history:{path:historyPath,before,after,unchanged:before===after},
  no_engine_or_model_calls:true,rows};
writeFileSync(`${candidate}/.artifacts/reproduction/live-input-replay.json`,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
