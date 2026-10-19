# W1.2 build-core-v1 interface (2026-10-19)

Canonical strict type: `agent/src/v6/build-core.ts`, exports `buildMetricSchema`, `BuildMetric`, `buildRawCountsSchema`, `BuildCore`, `BuildCombo`. Worktree: `.worktrees/v6-w12-build-core-pooled-20261019`. This supersedes old per-version/per-ascension metrics; no automatic migration or publication of pending R1.

Each combo has `prerequisites: Predicate | null`. Every fits item is `{text,evidence,when:Predicate|null}`. Null means no declared condition. Conditions reuse the W1/W8 whitelist without expanding it; unknown runtime facts stay unknown. Fits conditions describe applicability; only prerequisites gate formation.

Each combo has exactly two `metrics` entries, keyed solely by `attempt: "first" | "including_sl"`:

```ts
{
  attempt, target_ascension: 10,
  sources: [{version: string|null, ascension: number|null, run_ids: string[], counts: RawCounts}],
  raw_counts: RawCounts,
  observed: { /* unchanged 27 required buildObservedMetricNames: Statistic */ },
  bosses: { [target]: {reached: Statistic, won: Statistic, win_rate: Statistic} },
  availability: [{card, act, offered_rate: Statistic}],
  simulation: [{target, entry_hp: number|null, win_rate: Statistic, hp_loss: Statistic,
                completion_turns: Statistic, dpr: Statistic, trust, labels: string[]}],
  regression: [{target, win_rate: Statistic, hp_loss: Statistic, completion_turns: Statistic,
                ascension_offset: {win_rate: Statistic, hp_loss: Statistic, completion_turns: Statistic},
                method: string, labels: string[]}],
  shrinkage: [{basis: "observed"|"simulation"|"regression", target: string|null, metric: string,
               raw: Statistic, direction: Statistic, estimate: Statistic,
               combo_weight: number|null, method: string, labels: string[]}]
}
type RawCounts = {
  runs: number, formed_runs: number|null, cleared_runs: number|null,
  chain_reached: number|null, chain_won: number|null,
  bosses: {[target]: {reached:number, won:number}}
};
```

`Statistic` is the unchanged `buildStatisticSchema`: `{n,unit,method,value,p25?,p75?,se,distribution,evidence,unknown_reason,small_sample}`. No observations: n=0, value/se=null, no evidence, explicit reason. Positive n with an unidentifiable/out-of-range adjusted estimate: value=null with reason and actual evidence. Unavailable simulations/regressions may be empty arrays with an explicit draft limitation; existing targets with missing outcomes use unknown Statistic slots. No rate clamping.

Sources are disjoint independent run IDs per attempt. `counts.runs == run_ids.length`; pooled raw counts must equal source sums (null propagates). Missing boss key in one source counts as zero; every pooled boss key is explicit. Counts are per independent run, including SL; attempts/fights do not inflate the denominator. `scope.ascensions` is applicability, not a statistics partition. Sources may have unknown version/ascension without dropping those runs.

Regression: combine all versions/ascensions, A10 centered; combo/target fixed intercepts and ONE shared ascension coefficient per outcome and attempt. The `ascension_offset` triplet repeats that shared model coefficient for audit, not a per-combo/target fit. Cluster bootstrap samples whole runs; overlapping combo membership uses reciprocal membership weights. Direction estimates deduplicate runs. Estimation details, rank/identifiability, weighting, seed and interval method go in Statistic.method / regression.method / labels and the raw audit artifact. No built-in numeric game assumptions.

Shrinkage: `estimate = combo_weight * raw + (1-combo_weight) * direction`; metric names are observed names or `win_rate`/`hp_loss`/`completion_turns`. `target=null` for non-target observed measures. n<10 uses the generator's explicit documented direction shrinkage; unknown inputs remain unknown. Raw unshrunk counts/statistics are retained. No mandated pseudo-sample count or causal interpretation.

Generator normalization uses the minimum known max_hp in the SHA-verified frozen historical entries as the common entry HP. Each run keeps its actual deck, relics and max_hp. Missing historical max_hp: simulation.entry_hp=null; all simulated outcomes remain unknown with reasons. Static enemy data must match A10 exactly; no nearest-ascension fallback. Missing exact A10 starts or a truncated simulation makes that fight's outcomes unknown.
