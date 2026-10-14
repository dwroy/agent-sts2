/** Read the generated Silent artifact through the production B2/B3 consumers; no simulation or model calls. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2]!);
const output = resolve(process.argv[3]!);
const load = (name: string) => import(pathToFileURL(resolve(root, "agent/src", name)).href);
const { setKnowledgeCharacter } = await load("knowledge/files.ts");
setKnowledgeCharacter("silent");
const { bossTrustReason, LOW_TRUST_B2, LOW_CONFIDENCE_B3 } = await load("sim/boss-trust.ts");
const { calibratedWinProb } = await load("sim/boss-sim.ts");
const data = JSON.parse(readFileSync(resolve(root, "knowledge/characters/silent/boss-trust.json"), "utf8"));
assert.equal(data.character, "silent");
assert.deepEqual(LOW_TRUST_B2, data.low_trust_b2);
assert.deepEqual(LOW_CONFIDENCE_B3, data.low_confidence_b3);
const results: Record<string, unknown>[] = [];
for (const use of ["b2", "b3"] as const) {
  for (const boss of Object.keys(data.bosses)) {
    const reason = bossTrustReason(boss, use, 10, 17);
    assert.equal(reason === null, data["trusted_" + use].includes(boss));
    results.push({ boss, use, trusted: reason === null, reason });
  }
  assert.match(bossTrustReason("THE_KIN", use, 10, 49) ?? "", /F49/);
}
for (const start of ["start", "pre"] as const) {
  const fit = data.overall[start === "pre" ? "pre" : "t1"].platt;
  const actual = calibratedWinProb(0.5, 200, start, 10);
  const expected = 1 / (1 + Math.exp(-(fit.a + (fit.c ?? 0))));
  assert.ok(Math.abs(actual - expected) < 1e-12);
}
writeFileSync(output, JSON.stringify({ root, artifact: data.refresh.artifact, checks: 28, results,
  scope: "Actual artifact read through Silent production consumers; no natural-game adoption or win-rate claim." }, null, 1) + "\n");
console.log(JSON.stringify({ artifact: data.refresh.artifact, checks: 28, passed: true }));
