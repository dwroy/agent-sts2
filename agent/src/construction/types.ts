/** Evidence-owned templates and environment observations; no card values live in the planner. */
export interface Component { id: string; kind: "card" | "relic"; upgraded?: boolean }
export interface Requirement { id: string; any: Component[]; count: number; distinct?: boolean }
export interface CoreTemplate {
  id: string; name: string; character: string; ascensions: number[];
  status: "candidate" | "validated";
  requirements: Requirement[];
  evidence: { runs: string[]; source: string; sha256: string };
  limits: string[];
}
export interface BuildState {
  cards: { id: string; upgraded: boolean }[]; relics: string[];
  hp: number; maxHp: number; gold: number; floor: number; cap: number;
  combatResources?: { revives: import("../reflex/turn-solver.js").Revive[]; drunkKeys: string[] };
}
export type BuildAction =
  | { kind: "skip" }
  | { kind: "add"; card: { id: string; upgraded: boolean }; price: number; copies?: number }
  | { kind: "remove"; index: number; price: number }
  | { kind: "upgrade"; index: number; price: number }
  | { kind: "heal"; amount: number; price: number }
  | { kind: "relic"; id: string; price: number };
export interface Opportunity {
  id: string; run: string; ts: string; act: number; ascension: number; floor: number;
  kind: "reward" | "shop"; offers: { id: string; upgraded: boolean; price: number }[];
  source: { offset: number; bytes: number; sha256: string };
}
export interface OpportunityModel {
  schema: "construction-opportunities-v1"; character: string; generated: string;
  cutoff: string; digest: string; rows: Opportunity[]; limitations: string[];
}
export interface PathStep {
  floor: number; kind: "reward" | "shop" | "rest" | "fight" | "unknown";
  /** At a real future fight only the observation sampler/evaluator can supply its state. */
  encounter?: string;
  heal?: number; removalPrice?: number;
}
export interface FightObservation {
  hp: number; gold: number; won: boolean; complete: boolean;
  /** Qualified operation of the named core, independently of merely owning its cards. */
  functional: boolean | null; damage: number; turns: number;
  combatResources?: BuildState["combatResources"];
}
export type FightEvaluator = (state: Readonly<BuildState>, step: PathStep, seed: number, core: CoreTemplate) => FightObservation | null;
export interface Probability {
  successes: number; observed: number; unknown: number; samples: number;
  estimate: number | null; interval95: [number, number] | null;
  /** Bounds include unknown paths; the MC interval above does not include model error. */
  bounds: [number, number];
}
export interface PathForecast {
  core: string; candidate: boolean; samples: number; missingNow: { id: string; count: number }[];
  support: { opportunities: number; independentRuns: number; minimumPool: number };
  signature: Probability; conditionalSignature: Probability; aliveAndFunctional: Probability; terminalWin: Probability;
  firstSignatureFloor: number | null; meanDamagePerTurn: number | null;
  limits: string[];
}
