# P0.2 Jev 与代码第一名

复用原 ablation 冻结 32 题；其中 20 题偏离原代码顺序 plan1。原样本特意包含 override/tie/potion 等分层，比例不能冒作生产总体比例。

逐题四项、配对差、标准误、实际动作回执及战斗结局见 evaluation.json。原代码第一名、rollout 第一名、B2 第一名分开；仅有首动作回执不能声称整方案执行。

| 战斗 | 置信度段 | 涉药 | 题数 | 偏离 | 实胜 | 实死 | 未知/截断 |
|---|---|---|---:|---:|---:|---:|---:|
| hallway | below_0.5 | False | 6 | 3 | 6 | 0 | 0 |
| boss | 0.5_to_0.8 | False | 4 | 4 | 2 | 0 | 2 |
| hallway | 0.5_to_0.8 | False | 9 | 3 | 9 | 0 | 0 |
| hallway | at_least_0.8 | False | 3 | 3 | 3 | 0 | 0 |
| boss | below_0.5 | True | 1 | 1 | 0 | 0 | 1 |
| elite | below_0.5 | True | 1 | 1 | 0 | 0 | 1 |
| hallway | below_0.5 | True | 2 | 1 | 2 | 0 | 0 |
| elite | below_0.5 | False | 1 | 1 | 1 | 0 | 0 |
| boss | at_least_0.8 | False | 2 | 1 | 1 | 0 | 1 |
| hallway | at_least_0.8 | True | 1 | 1 | 1 | 0 | 0 |
| elite | at_least_0.8 | False | 1 | 1 | 1 | 0 | 0 |
| boss | at_least_0.8 | True | 1 | 0 | 1 | 0 | 0 |

模式建议：现阶段保持 full；可继续开发已批准的 tiebreak，但放行前补足 P3 与配对证据。旧题没有 S 逐样本/掉血配对标准误，不能把未知解释成“无显著差异”，也不足以支持 off。无新增 Jev 请求或全历史重跑。
