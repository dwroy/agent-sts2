/** Fixed W1 annotation over the actual planner; no model call, formal knowledge write or action execution. */
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("node:fs", async original => {
  const { historicalKnowledgeFs } = await import("./historical-knowledge-fs.js");
  const fs = historicalKnowledgeFs(await original<typeof import("node:fs")>());
  const { basename, dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const pinned = JSON.parse(fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), "boss-lines-data/pinned-knowledge.json"), "utf8"));
  return { ...fs, readFileSync: (path: any, ...rest: any[]) => {
    const name = basename(String(path));
    if (String(path).includes("/knowledge/") && name.endsWith(".json")) {
      if (name in pinned) return JSON.stringify(pinned[name]);
      throw Object.assign(new Error("ENOENT: fixed W8 fixture"), { code: "ENOENT" });
    }
    return (fs.readFileSync as any)(path, ...rest);
  } };
});
vi.resetModules();
const { logged, loggedEnv } = await import("./logged.js");
const { planCombatTurn } = await import("../src/reflex/combat-plan.js");
const entries = await import("../src/reflex/jev/combat-entries.js");
const { projectCombatDecision } = await import("../src/reflex/jev/combat-entry-projection.js");
const { installFixture, fixedBoss, fixedPlan } = await import("./v6-combat-fixtures.js");
const { rolloutLiveOptions } = await import("../src/reflex/rollout-live.js");
const { potionMcOptions } = await import("../src/reflex/potion-mc.js");
const boss = await import("../src/sim/boss-lines.js");
const originalBoss = { ...boss.bossLinesOptions }, originalRollout = { ...rolloutLiveOptions };
const directories: string[] = [];
afterEach(() => {
  boss.releaseBossLinesPool(); Object.assign(boss.bossLinesOptions, originalBoss); Object.assign(rolloutLiveOptions, originalRollout);
  potionMcOptions.now = null; vi.restoreAllMocks(); vi.unstubAllEnvs();
  directories.splice(0).forEach(d => rmSync(d, { recursive: true, force: true }));
});

it.each(["off", "v1"] as const)("actual %s planner attaches role-local entries and shows a low-trust Act 3 boss without changing options or rank", jevContext => {
  const directory = mkdtempSync(join(tmpdir(), "v6-combat-planner-")); directories.push(directory); installFixture(directory);
  const load = entries.loadCombatEntries;
  vi.spyOn(entries, "loadCombatEntries").mockImplementation((state, _directory, env, runtime) => load(state, directory, env, runtime));
  vi.spyOn(boss, "lowTrustOfState").mockReturnValue("TEST_UNVALIDATED_MODEL");
  const simulate = vi.spyOn(boss, "bossLineSim").mockImplementation(args => {
    if (!fixedBoss.available) throw Error("fixture");
    return { ...fixedBoss, run: { ...fixedBoss.run, lines: [], samples: 4, elapsedMs: 0 }, best: null, tied: [], plan: null,
      byPlan: new Map(args.lines.map(plan => [plan, { ...fixedBoss.byPlan.get(fixedPlan)!, text: "TEST low confidence" }])) } as any;
  });
  Object.assign(boss.bossLinesOptions, { enabled: true, lowTrust: "retry" });
  rolloutLiveOptions.enabled = false; rolloutLiveOptions.now = () => 0; potionMcOptions.now = () => 0;
  const decision = () => {
    const fx = logged("k8tc-f17-t5"), rawRun = fx.state.run as Record<string, unknown>;
    rawRun.character_id = "SILENT"; rawRun.ascension = 0; rawRun.act_id = "2";
    const d = planCombatTurn(loggedEnv(fx, { jevContext, sl: { attempt: 3, maxAttempts: 5, previousAttempts: [], showSim: false } }));
    if (!d || d.kind !== "ask") throw Error("expected a frozen combat question");
    return d;
  };
  vi.stubEnv("V6_COMBAT_ENTRIES", "off"); const baseline = decision(); expect(simulate).not.toHaveBeenCalled();
  vi.stubEnv("V6_COMBAT_ENTRIES", "on"); const on = decision(); expect(simulate).toHaveBeenCalledOnce();
  const old = baseline.jevView ?? baseline, current = on.jevView ?? on;
  const projection = projectCombatDecision(current.state, current.questions)!;
  expect(projection.contract.schema).toBe("v6-combat-decision-v1");
  expect((current.state as any).v6_combat_entries.context.sl.attempt).toBe(3);
  const qid = "plan";
  const before = old.questions[qid], after = projection.questions[qid];
  if (before?.type !== "choice" || after?.type !== "choice") throw Error("missing candidate set");
  expect(Object.keys(after.criteria)).toEqual(Object.keys(before.criteria));
  const planViews = Object.entries(after.criteria).filter(([key]) => key.startsWith("plan"));
  expect(planViews.length).toBeGreaterThan(0);
  for (const [key, text] of planViews) {
    const view = JSON.parse(text!), previous = JSON.parse(before.criteria[key]!);
    expect(view.rollout_best).toBe(previous.rollout_best);
    expect(view.plays).toBe(previous.plays);
    expect(view.simulation.whole_fight).toMatchObject({ samples: 4, win_probability: .4, trust: { level: "low", ranking_eligible: false } });
    expect(view.simulation.rollout).toMatchObject({ status: "unavailable", further_hp_loss: null });
    expect(view.combat_memory.every((m: any) => m.source.path === "characters/silent/reflex.json")).toBe(true);
    expect(view).not.toHaveProperty("v6_combat_entry"); expect(view).not.toHaveProperty("whole_fight_sim");
  }
  expect(JSON.stringify(projection.evidence)).toContain("TEST_AUDIT_ONLY");
});
