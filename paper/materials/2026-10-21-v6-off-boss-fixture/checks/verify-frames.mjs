import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const baselines = JSON.parse(readFileSync("agent/tests/v6-off-baseline.json", "utf8"));
const sha = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function diff(before, after, at = "") {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (before && after && typeof before === "object" && typeof after === "object") {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .flatMap(key => diff(before[key], after[key], `${at}/${key}`));
  }
  return [{ path: at, before, after }];
}
const rows = [];
for (const name of readdirSync(path.join(dir, "frames")).filter(name => name.startsWith("actual-")).sort()) {
  const current = JSON.parse(gunzipSync(readFileSync(path.join(dir, "frames", name))));
  const previous = JSON.parse(gunzipSync(readFileSync(path.join(dir, "frames", `previous-${name}`))));
  const [, character] = /^actual-(ironclad|silent|regent)-/.exec(name);
  const board = /(7b0d-f8-rest|xljq-f5-reward|u6ru-f22-shop)/.exec(name)[0];
  assert.equal(sha(previous), baselines[`${character}:${board}`]);
  assert.equal(JSON.stringify(previous.resolved), JSON.stringify(current.resolved));
  const changes = diff(previous, current);
  const expectedPaths = board !== "u6ru-f22-shop" || character === "regent" ? [] : character === "ironclad"
    ? ["/decision/state/facts/act_boss_clock/hp_loss_per_turn", "/decision/state/facts/act_boss_clock/fight_turns_note"]
    : ["/decision/state/facts/act_boss_clock/boss_enemies/0/attacks/2/per_hit"];
  assert.deepEqual(changes.map(row => row.path).sort(), expectedPaths.sort());
  rows.push({ frame: name, character, board, previous_hash: sha(previous), current_hash: sha(current),
    resolved_byte_equal: true, resolved_sha256: sha(current.resolved), changes });
}
assert.equal(rows.length, 27);
assert.equal(rows.filter(row => row.changes.length).length, 6);
const result = { compared_frames: 27, changed_frames: 6, resolved_byte_equal: 27,
  previous_frames_match_original_goldens: 27, rows };
writeFileSync(path.join(dir, "frame-byte-comparison.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ compared_frames: 27, changed_frames: 6, resolved_byte_equal: 27 })}\n`);
