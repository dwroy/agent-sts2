/** H1: Silent computation time, excluding action/animation waits. No game-value rules live here. */
import { AsyncLocalStorage } from "node:async_hooks";

export const HUMAN_PACE_BUDGETS = Object.freeze({ ordinary: 10_000, elite: 15_000, boss: 60_000,
  retry: 10_000, routine: 5_000, brain: 90_000, direction: 60_000 });
export type BudgetKind = keyof typeof HUMAN_PACE_BUDGETS;
export class DecisionBudgetExpired extends Error {
  constructor(readonly stage: string) { super(`human-pace budget exhausted: ${stage}`); this.name = "DecisionBudgetExpired"; }
}
export class DecisionBudget {
  private since: number | null;
  private spent = 0;
  private limit: number;
  private entryStart = 0;
  private entryAllowance: number;
  private entryStage = 0;
  private fallback: string | null = null;
  readonly skipped: string[] = [];
  readonly stages: { stage: string; budget_ms: number; actual_ms: number; timed_out: boolean }[] = [];
  constructor(readonly key: string, public kind: BudgetKind, readonly now = () => performance.now(), milliseconds?: number) {
    this.limit = milliseconds ?? HUMAN_PACE_BUDGETS[kind]; this.entryAllowance = this.limit; this.since = now();
  }
  elapsed(): number { return this.spent + (this.since === null ? 0 : Math.max(0, this.now() - this.since)); }
  remaining(cap = Infinity): number { return Math.max(0, Math.min(cap, this.limit - this.elapsed())); }
  pause(): void { if (this.since !== null) { this.spent = this.elapsed(); this.since = null; } }
  resume(): void { this.since ??= this.now(); }
  get running(): boolean { return this.since !== null; }
  beginEntry(): void { this.entryStart = this.elapsed(); this.entryAllowance = this.remaining(); this.entryStage = this.stages.length; this.fallback = null; }
  charge(milliseconds: number): void { this.spent += Math.max(0, milliseconds); }
  promoteBrain(): void { this.kind = "brain"; this.limit = Math.max(this.limit, HUMAN_PACE_BUDGETS.brain); }
  useFallback(reason: string): void { this.fallback = reason; }
  skip(stage: string): void { if (!this.skipped.includes(stage)) this.skipped.push(stage); }
  record() { return { schema: "decision-budget-v1", kind: this.kind, key: this.key, budget_ms: this.limit,
    entry_budget_ms: this.entryAllowance, actual_ms: Math.round(this.elapsed() - this.entryStart),
    turn_actual_ms: Math.round(this.elapsed()), timed_out: this.remaining() <= 0, fallback: this.fallback,
    shadow_unknown: [...this.skipped], stages: this.stages.slice(this.entryStage).map((s) => ({ ...s })), animation_time_included: false }; }
}

const storage = new AsyncLocalStorage<DecisionBudget | undefined>();
export const currentDecisionBudget = (): DecisionBudget | undefined => storage.getStore();
export const withDecisionBudget = <T>(value: DecisionBudget | undefined, work: () => T): T => storage.run(value, work);
/** Called only inside runLoop's isolated async scope, after the actual role has been checked. */
export const enterDecisionBudget = (value: DecisionBudget | undefined): void => storage.enterWith(value);

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
  finally { clearTimeout(timer); budget.stages.push({ stage, budget_ms: ms,
    actual_ms: Math.round(budget.now() - started), timed_out: timedOut }); }
}
