import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { makeKnowledge } from '../../../agent/src/knowledge/index.js';
import { KNOWLEDGE_DIR, knowledgeFile, setKnowledgeCharacter } from '../../../agent/src/knowledge/files.js';
import { parseGameState } from '../../../agent/src/hand/mod/schema.js';
import { fingerprint } from '../../../agent/src/hand/act/gate.js';
import { boardOf } from '../../../agent/tools/boss-sim/backtest-board.js';
import { readMonsterDbJson } from '../../../agent/src/knowledge/monster-db.js';
import { replaySteps } from '../../../agent/src/reflex/turn-solver.js';
import { runLines, rankLines } from '../../../agent/src/sim/boss-lines.js';
import { compareLines } from '../../../agent/src/sim/boss-sim.js';

setKnowledgeCharacter('silent');
const dir = process.argv[2]!;
const dry = process.argv.includes('--dry');
const rows = JSON.parse(readFileSync(`${dir}/ranking-inputs.json`, 'utf8'));
const knowledge = makeKnowledge(JSON.parse(readFileSync(`${dir}/game-data.frozen.json`, 'utf8')).collections, 'cache');
const db = readMonsterDbJson().monsters;
const mm = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, 'move-model.json'), 'utf8'));
const output = `${dir}/ranking-${dry ? 'boards' : 'results'}.jsonl`;
writeFileSync(output, '');
for (const row of rows) {
  const matched = row.states.find((s) => fingerprint(parseGameState(s.state)) === row.fingerprint);
  if (!matched) {
    appendFileSync(output, JSON.stringify({ key: row.key, turn: row.turn, error: 'original decision fingerprint has no matching frozen state' })+'\n');
    continue;
  }
  try {
    const state = parseGameState(matched.state);
    const board = boardOf(state, knowledge, 'QUEEN+TORCH_HEAD_AMALGAM', db, mm);
    const plans = [];
    const labels = [];
    const missing = [];
    for (const [label, text] of Object.entries(row.plays)) {
      const used = new Set();
      const steps = [];
      let invalid = false;
      for (const token of text === 'nothing (end the turn now)' ? [] : text.split(', then ')) {
        const [name, targetName] = token.split(' -> ');
        const card = board.solver.hand.find((c) => c.name === name && !used.has(c.index));
        const target = targetName ? board.solver.enemies.find((e) => e.name === targetName) : null;
        if (!card || targetName && !target) { invalid = true; break; }
        used.add(card.index);
        steps.push({ cardIndex: card.index, cardId: card.cardId, upgraded: card.upgraded, name: card.name, target: target?.index ?? null, targetName: target?.name ?? null });
      }
      const plan = invalid ? null : replaySteps(board.solver, steps);
      if (!plan) { missing.push(label); continue; }
      plans.push(plan); labels.push(label);
    }
    const rec = { key: row.key, turn: row.turn, side: row.side, chosen: row.chosen, actual_won: row.actual_won,
      source: { off: matched.off, len: matched.len, sha256: matched.sha256 }, labels, missing,
      samples: 200, seed: 7, deadline: null, serial: true, all_original_plans_present: missing.length === 0 };
    if (dry || plans.length === 0) {
      appendFileSync(output, JSON.stringify(rec)+'\n'); continue;
    }
    // Original logged options are replayed on the same 200 seeds, without a wall-clock cutoff.
    const result = runLines(board.input, plans, { samples: 200, seed: 7, deadlineMs: Infinity, serial: true });
    const rank = rankLines(result.lines, 2);
    const chosen = labels.indexOf(row.chosen);
    appendFileSync(output, JSON.stringify({ ...rec, rank, best: labels[rank.best], chosen_index: chosen,
      paired: chosen >= 0 ? compareLines(result.lines[chosen], result.lines[rank.best]) : null,
      chosen_is_best: chosen === rank.best || rank.tied.includes(chosen),
      chosen_win_tied: chosen >= 0 ? rank.winTied[chosen] : null, lines: result.lines,
      completed_samples: result.samples, orders: result.orders })+'\n');
    process.stderr.write(`${row.key} T${row.turn}: ${result.samples} samples, best ${labels[rank.best]}, chosen ${row.chosen}\n`);
  } catch (error) {
    appendFileSync(output, JSON.stringify({ key: row.key, turn: row.turn, error: String(error) })+'\n');
  }
}
