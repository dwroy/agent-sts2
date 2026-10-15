/** C2 incremental controller. Only supplied prefixes are inspected; workers and samples belong to the caller. */
import { ADAPTIVE_RULE, adaptiveShadow, type AdaptiveCandidate } from "./adaptive-shadow.js";
import { asArray, asRecord } from "../core/util/json.js";

/** A status string alone cannot release the mandatory-computation gate or enter the complete memo. */
export function isAdaptiveComplete(value: unknown, lane: "b2" | "b3", requested: number, counts: ReadonlyMap<string, number>): boolean {
  const result = asRecord(value), rule = asRecord(result["rule"]), candidates = asArray(result["candidates"]).map(asRecord);
  if (result["schema"] !== "sim-adaptive-v1" || result["mode"] !== "on" || result["status"] !== "complete_adaptive"
      || result["lane"] !== lane || rule["version"] !== ADAPTIVE_RULE.version || rule["requested"] !== requested
      || !Number.isSafeInteger(requested) || requested < 1 || candidates.length !== counts.size || !candidates.length
      || new Set(candidates.map((c) => c["key"])).size !== candidates.length) return false;
  const first = lane === "b3" ? ADAPTIVE_RULE.b3First : ADAPTIVE_RULE.b2First;
  const sizes = candidates.map((c) => Number(c["samples"])), largest = Math.max(...sizes);
  if (candidates.some((c, i) => !Number.isSafeInteger(sizes[i]) || sizes[i]! < Math.min(first, requested) || sizes[i]! > requested
      || counts.get(String(c["key"])) !== sizes[i] || !Number.isSafeInteger(c["rounds"]) || Number(c["rounds"]) < 1
      || !["eliminated", "leader", "max"].includes(String(c["stop"]))
      || (c["stop"] !== "eliminated" && sizes[i] !== largest))) return false;
  const active = candidates.filter((c) => c["stop"] !== "eliminated");
  if (lane === "b3" && !active.some((c) => c["key"] === "@current" && c["baseline"] === true)) return false;
  const choices = active.filter((c) => c["baseline"] !== true);
  return choices.length > 0 && (largest === requested || choices.length === 1);
}

type Identity = Pick<AdaptiveCandidate, "key" | "baseline" | "workGroup">;
type Options = { lane: "b2" | "b3"; requested: number; allowS: boolean; first?: number; zElim?: number };
export class AdaptiveSampler {
  readonly candidates: readonly Identity[];
  private readonly active: Set<string>;
  private readonly used = new Map<string, { samples: number; rounds: number; stop: "eliminated" | "leader" | "max" }>();
  private n = 0;
  private finished = false;
  private final: { leader: string; group: string[] } | null = null;
  private history: ReturnType<typeof adaptiveShadow>["rounds"] = [];
  private evaluable = true;

  constructor(candidates: readonly Identity[], readonly options: Options) {
    if (!candidates.length || !candidates.some((c) => !c.baseline) || new Set(candidates.map((c) => c.key)).size !== candidates.length
        || !Number.isSafeInteger(options.requested) || options.requested < 1) throw new Error("invalid adaptive candidate identity or cap");
    // A caller may pass a structurally wider object; never retain its future sample arrays as identity metadata.
    this.candidates = candidates.map(({ key, baseline, workGroup }) => ({ key, baseline, workGroup }));
    this.active = new Set(candidates.map((c) => c.key));
    for (const candidate of candidates) this.used.set(candidate.key, { samples: 0, rounds: 0, stop: "max" });
  }

  next(): { from: number; to: number; active: string[] } | null {
    if (this.finished) return null;
    const first = this.options.first ?? (this.options.lane === "b3" ? ADAPTIVE_RULE.b3First : ADAPTIVE_RULE.b2First);
    return { from: this.n, to: Math.min(this.options.requested, this.n ? this.n + ADAPTIVE_RULE.batch : first), active: [...this.active] };
  }

  observe(prefixes: readonly AdaptiveCandidate[]): void {
    const request = this.next();
    if (!request) throw new Error("adaptive result already complete");
    const byKey = new Map(prefixes.map((candidate) => [candidate.key, candidate]));
    if (byKey.size !== prefixes.length) throw new Error("duplicate adaptive prefix identity");
    const round = this.candidates.filter((candidate) => this.active.has(candidate.key)).map((identity) => {
      const prefix = byKey.get(identity.key);
      if (!prefix || prefix.samples.length !== request.to || prefix.orders?.some((order) => order.length !== request.to)) {
        throw new Error("adaptive worker prefix incomplete or includes future samples");
      }
      return { ...prefix, ...identity };
    });
    // Setting first=requested evaluates exactly this round with the same rule already validated in shadow.
    const decision = adaptiveShadow(round, { ...this.options, requested: request.to, first: request.to });
    this.evaluable &&= decision.evaluable;
    this.n = request.to;
    for (const candidate of round) {
      const value = this.used.get(candidate.key)!;
      value.samples = this.n;
      value.rounds++;
    }
    for (const candidate of decision.candidates) if (candidate.stop === "eliminated") {
      this.active.delete(candidate.key);
      this.used.get(candidate.key)!.stop = "eliminated";
    }
    this.history.push(...decision.rounds);
    this.final = decision.shadow;
    const remaining = this.candidates.filter((candidate) => !candidate.baseline && this.active.has(candidate.key));
    this.finished = remaining.length === 1 || this.n === this.options.requested;
    if (this.finished) for (const key of this.active) this.used.get(key)!.stop = this.n === this.options.requested ? "max" : "leader";
  }

  result() {
    if (!this.finished || !this.final) throw new Error("adaptive computation not complete");
    const work = new Map<string, number>();
    for (const candidate of this.candidates) work.set(candidate.workGroup ?? candidate.key,
      Math.max(work.get(candidate.workGroup ?? candidate.key) ?? 0, this.used.get(candidate.key)!.samples));
    const full = work.size * this.options.requested, actual = [...work.values()].reduce((a, b) => a + b, 0);
    return { schema: "sim-adaptive-v1", mode: "on", status: "complete_adaptive", lane: this.options.lane,
      rule: { ...ADAPTIVE_RULE, first: this.options.first ?? (this.options.lane === "b3" ? ADAPTIVE_RULE.b3First : ADAPTIVE_RULE.b2First),
        zElim: this.options.zElim ?? ADAPTIVE_RULE.zElim, requested: this.options.requested },
      candidates: this.candidates.map((candidate) => ({ key: candidate.key, ...this.used.get(candidate.key)!, baseline: candidate.baseline === true })),
      final: this.final, rounds: this.history, evaluable: this.evaluable,
      work: { full, actual, savedFraction: 1 - actual / full, unit: "unique-option-sample-equivalents" },
      limits: "Actual prefixes only. All candidates remain available with their own sample count. Full-run agreement is an independent admission result, not observed during an early-stopped question." };
  }
}
