# B 缓存生产接线合同

`V6ProjectionRuntime.duringModelWait<T>(env, result: Promise<T>): Promise<T>`

- 调用方先创建原模型 Promise；包装器不再发请求、不执行动作。
- mode=off 无 B IO/求解；on 即使 CARD=brain 也可预热，为当前 brain 配置保留未来缓存证据。
- 同一 runtime 至多一个 cardPending，共用既有 runner/前台 lease。等待 acquireForeground 后才开始计算预算。
- 单次 B 预算 `min(idleMs, v6Config().budgets.pick_ms)`，目前 5000ms；原模型 Promise 结束（包括 reject）立即 abort，不 join。已在同步执行的一个求解切片不能硬中止。
- 生产 loop 原 choosePlan、choose、Jev wait 三处挂接；不新增 direction ask。决策前仍中止/收束 B 后再开始 A 的独立预算。

`peekCompletedCore(env)` 接口保持不变：当前 state/HP/floor/route/知识身份指纹匹配才返回 `{long_term,progress,targets,unknown_reasons}`，否则 null。getter 不调用 evaluate/context/factory，不启动后台任务。

新增可选 `card.recordBackground(env, event: V6CoreCacheEvent)`：

```ts
interface V6CoreCacheEvent {
  fingerprint: string | null;
  elapsed_ms: number;
  preparation_ms: number;
  allowance_ms: number;
  aborted: boolean;
  rows: number;
  sampled_rows: number; // rows with at least two samples, not independent battles
  unknown_reasons: Record<string, number>; // per-row labels, overlapping counts
  error?: string;
}
```

生产文件 `logs/v6-core-cache.jsonl` 追加 ts、run_id、floor。该日志与 `v6-card-results.jsonl` 的 A 前台审计分开，不能混用耗时或分母。B 数值多为少量样本，只表示已计算，不代表可信度门/质量验收。

样本复用键是 `[seed, modelVersion, slimInput(freshPrepared.input)]` 的摘要。先在当前状态构造开场，才可找到完全相同有效输入的绝对样本。外层已发布状态指纹没有放松；HP、卡面、药水、敌人、连战、seed/模型改变的负控均在固定测试里。

题面保持 `paired-criteria-v1` 与 Nova Decisions `choice.criteria`。`A_vs_skip` 为 mandatory；B 按候选实际推进组合列结果/还缺几张，有值带 n/SE，无值保留原因。总请求仍≤24,000B，保留 17 组合目录/每组合首条可用缓存结果；可选 B 复制详情不足时记录 `numeric_targets_omitted`，不丢全部目录，不乘 P，不改 known 门。

增量依赖：本次 source → `eea3519d9`（精度测试）→ `8176954bf6`（材料）→ `024612ef7`（八叶 criteria 实现）。ops 可用 cumulative patch 对照原 `572bf468`，只精确搬本项必要叶；生产公式、阈值、知识及 runtime 配置不在运输范围。
