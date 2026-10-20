# R404 P1 方向搭车核验

2026-10-20 22:40:53 CST；原 owner：v6-w8 / codex1 / native session 01a15382-761a-76a2-922d-271169b2463c。任务来源为 Claude 22:4x、Roy 授权的 docs/v6-plan.md §12（0ee818a8f）。只读取样，未启动模型、API、模拟、刷新或完整测试，未改变 live/配置。

结论：独立方向请求为零；方向概率初始化和搭车更新均未通过。不能把零额外请求当作完整验收。

| 冻结窗口 | Y427BMQH8AU6 | 5ZEPCTQKKXE4 |
|---|---:|---:|
| run-config（CST） | 21:29:38.520 | 22:18:45.064 |
| 最后 brain 记录（CST） | 22:08:19.797 | 22:35:15.734（未完局） |
| brain 请求 | 40 | 18 |
| 独立方向请求 | 0 | 0 |
| event/plan / event/act-plan | 1 / 1 | 1 / 0 |
| run-plan 配置 | off | off |
| 保存的 run plan / direction-weights-v1 回答 | 0 / 0 | 0 / 0 |
| T4 搭车 prepared | 9 | 1 |
| 实际带有效方向上下文 / 成功保存更新 | 0 / 0 | 0 / 0 |

`brain.jsonl` 和 `codex-calls.jsonl` 的请求标签相互核对；均无 `run-plan` 或独立方向调用。首局 24 次、第二局 8 次 reward/card 仍走大脑，此问题属于 W4 的 P0；不把这些计为额外方向请求。

## 未通过的原因

1. 两局原始 run-config 均为 `loop.run_plan=off`、`run_plan_merge=true`、`v6.direction_replan=off`。当前 loop 仅在 `config.runPlan === "v1"` 时把初始/换幕 run-plan 任务和方向上下文挂到现有问题。当前实际使用的 `event/plan`、`event/act-plan` 没有因此初始化方向概率；两局回答和 run-plans 日志均未出现保存的方向权重。
2. 后续已观察到正式组合牌变化触发 T4：首局 F12 `BACKFLIP`，第二局 F14 `CLOAK_AND_DAGGER`、F15 `LEG_SWEEP` 等。首局 9 次、第二局 1 次 prepared 都只是在组题前记的准备日志；核对实际 brain payload，10 次的 `v6_direction_task` 全部被替换为：
   `{"unknown_reason":"direction_ride_required_context_exceeds_remaining_30000_char_budget"}`。
   `fitDirectionRide` 无法在剩余预算内保留必需上下文时走此分支；任务不再符合 `directionRideTask` 合同，回答无 v6，也不进入 finish/attempted，导致同一原因反复搭车。不能把 prepared 当实际发送有效题面，更不能算更新成功。
3. 未观察到 T3 的可验证配对状态指纹；日志按原合同保留 unknown，未推断需要转向或伪造更新。

修复应把方向初始化附在已经存在的 `event/plan`、`event/act-plan` 回答里，且不能以开启额外 run-plan 请求来补齐。体积保护应保留四方向最小必要上下文并明确记录 omitted/完成状态，避免静默丢任务后重复 prepared。当前只交核验结论，尚未改变代码或预算，建议由 Claude 协调该 P1 接线修复。

## 证据与限制

`summary.json` 是逐请求的紧凑投影；`checks/manifest.json` 给出每个原始取样及 index 的 SHA256。`checks/*.gz` 是原始匹配 JSONL 和来源 byte offset/index 的无损压缩，解压 SHA 可对账；原采样保存在自有工作树 `.artifacts/p1/`。每个源文件按 index 中冻结的 end byte 截止，不追读在途日志。第二局只覆盖该截止窗口，后续结果未知。

题面超过整体 30k 的 V5 原有字段不在本次核验中修改；本报告仅确认方向段被省略的实际记录，不用省略后的 payload 大小倒推省略前大小。配置中的 Git ENOBUFS 缺失保留原状，实际 R404 发布来源沿 ops `paper/materials/20261020-2125-ops/receipt.json`，不伪造运行配置 commit。
