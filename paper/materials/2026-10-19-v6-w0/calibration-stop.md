# Silent Boss 校准中断口径

原分支 `silent-boss-calibration-refresh-20261018-083038`，检查点 `03cb9f2bfb89dadfb0dbda4cc875bc7536714737`。本次只读，不重启、不改原owner、不发布。

| 来源 | 已完成/应完成 | 解释 |
|---|---|---|
| 03cb9f2 的 progress/2026-10-19T110716_0800-217/status.json | 217/1316 | 11:07:16 固定检查点本身；status=incomplete、published=false |
| V6计划/讨论 | 254/1316 | 后续观察口径，保留原文，不倒填检查点 |
| paper/materials/20261019-1213-ops/receipt.json 与 1220-ops/blocked-status.json | 280/1316 | 12:19–12:20原ops后续收据，仍缺1036，2个模拟失败；不是完整验收 |

生产冻结提交 `9f4245511181c6228cf63dc44700ea28ccf35730`；模型SHA256 `c9f5bfecafd45698af4c8e14f929c4d41cf03afb73818d0dedc2f257c4ef858b`；来源提交 `e092b426c6aa5296901cd05fe0b8de6e3a63434c`。进度材料位于 `experiments/boss-sim/silent/58c7b7f5bcd6e83e39e0c5cafac5e7b74da6a4dc32576ea130bc29887a3f6fab/`。

调参107 keys、T1/pre各107条中106成功/1无解；调参107/验证551共658起点、366局、1617尝试。检查点Platt T1 a=2.0443 b=.4536 c=0；pre a=2.2681 b=.5105 c=0。它们只来自tune，A10残差也只属tune，不能报告验证已通过或更新boss-trust。

原完整vitest有失败（1/11文件失败），后续Python21项与定向16项通过不覆盖该失败。关联提案 `silent-proposal-da817af4fc7159de`、账本 `silent-0519` 与原final-report保持未闭环。原报告 `learner/runs/20261019-081937-fbd78246-f888-40b7-bd52-b9d5e04bf880-silent-boss-calibration/final-report.json`。本次W0自身测试即使通过，也不重写该历史结论。
