/** H1: Silent computation time, excluding action/animation waits. No game-value rules live here. */
import { AsyncLocalStorage } from "node:async_hooks";

export const HUMAN_PACE_BUDGETS = Object.freeze({ ordinary: 10_000, elite: 15_000, boss: 60_000,
  retry: 10_000, routine: 5_000, brain: 90_000, direction: 60_000 });
export type BudgetKind = keyof typeof HUMAN_PACE_BUDGETS;
export const COMBAT_JEV_RESERVE_MS = 3_000;
export const combatBudgetKind = (fight: string): BudgetKind => fight === "boss" ? "boss" : fight === "elite" ? "elite" : "ordinary";
const computationStorage = new AsyncLocalStorage<DecisionBudget>();
export class DecisionBudgetExpired extends Error {
  constructor(readonly stage: string) { super(`human-pace budget exhausted: ${stage}`); this.name = "DecisionBudgetExpired"; }
}
export interface BudgetStage {
  stage: string; budget_ms: number; actual_ms: number; timed_out: boolean;
  scope?: "L2" | "shadow"; shared_remaining_ms?: number; stages?: BudgetStage[];
}
export class DecisionBudget {
  private since: number | null;
  private spent = 0;
  private limit: number;
  private entryStart = 0;
  private entryAllowance: number;
  private entryStage = 0;
  private fallback: string | null = null;
  private independentSpent = 0;
  private independentEntryStart = 0;
  private jevSpent = 0;
  readonly skipped: string[] = [];
  readonly stages: BudgetStage[] = [];
  constructor(readonly key: string, public kind: BudgetKind, readonly now = () => performance.now(), milliseconds?: number,
    readonly jevReserveMs = ["ordinary", "elite", "boss", "retry"].includes(kind) ? COMBAT_JEV_RESERVE_MS : 0) {
    this.limit = milliseconds ?? HUMAN_PACE_BUDGETS[kind]; this.entryAllowance = this.limit; this.since = now();
  }
  elapsed(): number { return this.spent + (this.since === null ? 0 : Math.max(0, this.now() - this.since)); }
  private totalRemaining(cap = Infinity): number { return Math.max(0, Math.min(cap, this.limit - this.elapsed())); }
  private unspentJevReserve(): number { return Math.max(0, this.jevReserveMs - this.jevSpent); }
  /** In the planner scope every existing solver/worker/rollout deadline sees the protected allowance. */
  remaining(cap = Infinity): number { return computationStorage.getStore() === this ? this.computationRemaining(cap) : this.totalRemaining(cap); }
  computationRemaining(cap = Infinity): number { return Math.max(0, Math.min(cap, this.totalRemaining() - this.unspentJevReserve())); }
  chargeJev(milliseconds: number): void { this.jevSpent += Math.max(0, milliseconds); }
  pause(): void { if (this.since !== null) { this.spent = this.elapsed(); this.since = null; } }
  resume(): void { this.since ??= this.now(); }
  get running(): boolean { return this.since !== null; }
  beginEntry(): void { this.entryStart = this.elapsed(); this.independentEntryStart = this.independentSpent; this.entryAllowance = this.remaining(); this.entryStage = this.stages.length; this.fallback = null; }
  charge(milliseconds: number): void { this.spent += Math.max(0, milliseconds); }
  promoteBrain(): void { this.kind = "brain"; this.limit = Math.max(this.limit, HUMAN_PACE_BUDGETS.brain); }
  useFallback(reason: string): void { this.fallback = reason; }
  skip(stage: string): void { if (!this.skipped.includes(stage)) this.skipped.push(stage); }
  independent(stage: string, child: DecisionBudget, scope: "L2" | "shadow"): void {
    const record = child.record();
    this.independentSpent += record.turn_actual_ms;
    this.stages.push({ stage, scope, budget_ms: record.budget_ms, actual_ms: record.turn_actual_ms,
      timed_out: record.timed_out, shared_remaining_ms: this.remaining(), stages: record.stages });
    for (const skipped of child.skipped) this.skip(skipped);
  }
  record() { return { schema: "decision-budget-v1", kind: this.kind, key: this.key, budget_ms: this.limit,
    entry_budget_ms: this.entryAllowance, actual_ms: Math.round(this.elapsed() - this.entryStart + this.independentSpent - this.independentEntryStart),
    turn_actual_ms: Math.round(this.elapsed() + this.independentSpent), shared_actual_ms: Math.round(this.elapsed() - this.entryStart),
    independent_actual_ms: Math.round(this.independentSpent - this.independentEntryStart),
    timed_out: this.totalRemaining() <= 0 || this.stages.slice(this.entryStage).some((s) => s.scope === "L2" && s.timed_out), fallback: this.fallback,
    ...(this.jevReserveMs ? { jev_reserve_ms: this.jevReserveMs, jev_actual_ms: Math.round(this.jevSpent),
      jev_reserved_remaining_ms: this.unspentJevReserve(), computation_remaining_ms: this.computationRemaining() } : {}),
    shadow_unknown: [...this.skipped], stages: this.stages.slice(this.entryStage).map((s) => ({ ...s })), animation_time_included: false }; }
}

const storage = new AsyncLocalStorage<DecisionBudget | undefined>();
export const currentDecisionBudget = (): DecisionBudget | undefined => storage.getStore();
export const withDecisionBudget = <T>(value: DecisionBudget | undefined, work: () => T): T => storage.run(value, work);
/** Called only inside runLoop's isolated async scope, after the actual role has been checked. */
export const enterDecisionBudget = (value: DecisionBudget | undefined): void => storage.enterWith(value);

/** One reservation per combat turn, shared across card steps and re-asks; no extra turn time is granted. */
export function withCombatComputation<T>(work: () => T): T {
  const budget = currentDecisionBudget();
  if (!budget?.jevReserveMs || computationStorage.getStore() === budget) return work();
  const started = budget.elapsed(), allowance = budget.computationRemaining();
  const finish = (): void => { budget.stages.push({ stage: "combat_computation", budget_ms: allowance,
    actual_ms: Math.round(budget.elapsed() - started), timed_out: budget.computationRemaining() <= 0 }); };
  let value: T;
  try { value = computationStorage.run(budget, work); } catch (error) { finish(); throw error; }
  if (value instanceof Promise) return value.finally(finish) as T;
  finish(); return value;
}

/** Separate allowance, same clock: neither L2 nor an observer debits the real computation budget. */
export function withIndependentDecisionBudget<T>(stage: string, kind: BudgetKind, milliseconds: number,
  scope: "L2" | "shadow", work: () => T): T {
  const parent = currentDecisionBudget();
  if (!parent) return work();
  const running = parent.running;
  parent.pause();
  const child = new DecisionBudget(`${parent.key}:${stage}`, kind, parent.now, milliseconds, 0);
  const finish = (): void => { child.pause(); parent.independent(stage, child, scope); if (running) parent.resume(); };
  let value: T;
  try { value = withDecisionBudget(child, work); } catch (error) { finish(); throw error; }
  if (value instanceof Promise) return value.finally(finish) as T;
  finish(); return value;
}

/** Preserve the observer's existing maximum allowance without spending the real decision's time. */
export function withShadowDecisionBudget<T>(stage: string, work: () => T, enabled = true): T {
  const parent = currentDecisionBudget();
  return parent && enabled ? withIndependentDecisionBudget(stage, parent.kind, parent.remaining(), "shadow", work) : work();
}

/** Inclusive shared computation time excludes any separately accounted observers or L2 calls. */
export function measureDecisionBudgetStage<T>(stage: string, work: () => T): T {
  const budget = currentDecisionBudget();
  if (!budget) return work();
  const started = budget.elapsed(), allowance = budget.remaining();
  const finish = (): void => { budget.stages.push({ stage, budget_ms: allowance,
    actual_ms: Math.round(budget.elapsed() - started), timed_out: budget.remaining() <= 0 }); };
  let value: T;
  try { value = work(); } catch (error) { finish(); throw error; }
  if (value instanceof Promise) return value.finally(finish) as T;
  finish(); return value;
}

/** Each fight turn shares one allowance across re-asks and card-by-card decisions. */
export class DecisionBudgetLedger {
  private last: DecisionBudget | undefined;
  constructor(private readonly now = () => performance.now()) {}
  open(key: string, kind: BudgetKind): DecisionBudget {
    if (this.last?.key !== key) this.last = new DecisionBudget(key, kind, this.now);
    this.last!.resume(); this.last!.beginEntry(); return this.last!;
  }
}

/** Transport/animation waits are outside our computation allowance. */
export async function outsideDecisionBudget<T>(work: () => Promise<T>): Promise<T> {
  const budget = currentDecisionBudget(), running = budget?.running;
  budget?.pause();
  try { return await work(); } finally { if (running) budget?.resume(); }
}

export function shadowBudgetAvailable(stage: string): boolean {
  const budget = currentDecisionBudget();
  if (!budget || budget.remaining() > 0) return true;
  budget.skip(stage); return false;
}
export const budgetUnknown = (stage: string) => ({ status: "unknown", reason: "decision_budget_exhausted", stage });

/** Timers abort the actual caller; a late result is never accepted by this decision. */
export async function withinDecisionBudget<T>(stage: string, work: (signal?: AbortSignal) => Promise<T>, cap = Infinity): Promise<T> {
  const budget = currentDecisionBudget();
  if (!budget) return work();
  const ms = budget.remaining(cap), started = budget.now();
  if (ms <= 0) throw new DecisionBudgetExpired(stage);
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  const expires = new Promise<never>((_, reject) => { timer = setTimeout(() => {
    controller.abort(); reject(new DecisionBudgetExpired(stage));
  }, ms); });
  let timedOut = false;
  try {
    const result = await Promise.race([work(controller.signal), expires]);
    if (budget.remaining() <= 0) { controller.abort(); throw new DecisionBudgetExpired(stage); }
    return result;
  }
  catch (error) { timedOut = error instanceof DecisionBudgetExpired; throw error; }
  finally {
    clearTimeout(timer);
    const actual = Math.max(0, budget.now() - started);
    if (/^Jev(?:$|_)/.test(stage)) budget.chargeJev(actual);
    budget.stages.push({ stage, budget_ms: ms, actual_ms: Math.round(actual), timed_out: timedOut });
  }
}
