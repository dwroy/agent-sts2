import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync, gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadConfig} from '../../../agent/src/core/config.ts';
import {makeKnowledge} from '../../../agent/src/knowledge/index.ts';
import {parseGameState} from '../../../agent/src/hand/mod/schema.ts';
import {buildRunBrief} from '../../../agent/src/memory/run-brief.ts';
import {createScreenMemory} from '../../../agent/src/memory/types.ts';
import {planCombatTurn} from '../../../agent/src/reflex/combat-plan.ts';
import {bossLinesOptions, releaseBossLinesPool} from '../../../agent/src/sim/boss-lines.ts';
import {signAudit} from '../../../agent/tools/s-sign-audit.ts';
const here = (name: string) => new URL(name, import.meta.url);
const raw = gunzipSync(readFileSync(here('b2-state.json.gz')));
const binding = JSON.parse(readFileSync(here('b2-state-binding.json'), 'utf8'));
if (createHash('sha256').update(raw).digest('hex') !== binding.raw_sha256) throw new Error('input changed');
const row = JSON.parse(raw.toString()), state = parseGameState(row.state);
const config = loadConfig({CHARACTER:'SILENT'});
const knowledge = makeKnowledge(JSON.parse(readFileSync(new URL('../../../data/game-data.json', import.meta.url), 'utf8')).collections, 'cache');
const cases: any[] = [];
bossLinesOptions.serial = true;
bossLinesOptions.samples = 600;
bossLinesOptions.onSim = (sim) => {
 if (!sim.available) throw new Error(sim.reason);
 sim.run.lines.forEach((line, index) => cases.push({id:`line:${index}`,boss:sim.boss ?? 'unknown',ascension:state.run?.ascension,lane:'b2',source:binding.raw_sha256,
  samples:line.outcomes.map((s) => ({won:s.won,died:s.died,capped:s.capped,timeUp:s.timeUp,turns:s.turns,revived:s.revived,bossMargin:s.bossMargin,...(s.sequence?{sequence:s.sequence}:{})}))}));
};
try {
 const began = performance.now();
 const decision = planCombatTurn({state,knowledge,brief:buildRunBrief(state,knowledge),screenMemory:createScreenMemory(state.screen),thresholds:config.thresholds,
  runStart:'continue',characterPreference:null,allowFtueModals:false,strictJev:true,combatPlanner:'turn',shopDiscardPotions:config.shop.discardPotions,
  jevContext:config.jevContext,fightPlan:'off',requiredBossEvaluation:true});
 if (!cases.length) throw new Error('no B2 sample capture; not an audit pass');
 writeFileSync(here('b2-samples.json.gz'), gzipSync(JSON.stringify(cases)));
 writeFileSync(here('b2-sign-audit.json'),JSON.stringify(signAudit(cases),null,2)+'\n');
 writeFileSync(here('b2-replay-result.json'),JSON.stringify({binding,started_model:'current feature baseline 264efa2ea + P0/P1 source',samples:600,serial:true,
  ms:performance.now()-began,decision,scope:'Current-model B2 on original frozen state; fresh memory, not historical selection reproduction; no Jev or game actions'},null,2)+'\n');
 console.log(JSON.stringify({cases:cases.length,groups:signAudit(cases).groups.map((g)=>({boss:g.boss,ascension:g.ascension,samples:g.audit.samples,valid:g.audit.valid,missing:g.audit.missing,mismatches:g.audit.mismatches}))}));
} finally { releaseBossLinesPool(); }
