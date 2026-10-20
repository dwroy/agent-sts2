按 Claude 19:41 与 ops 19:45 同包窄集成决定，修正旧 fastpath 基准的合同。原 `calls` 是构筑评估 provider 的调用记录；Roy 18:4x 已取消独立方向请求，所以它应为 0。商店仍由原 V5 大脑在同一次 `shop/plan` 回答中给出购买计划，固定题实际为 1 次。原断言保留了旧独立方向 provider 调用期望，属于旧设计期望，不需要修改生产逻辑。

正式源码 `2a1a4bd7ae61a5ed73b2d332927fc96451a3ea14`，父 `b85d29a78fdd2064c4f7d01ec9b16e25a15140aa`，tree `440cdeb5457fadfe2f249d992cf779ca714ccbb5`。增量仅 `agent/tests/v6-direction-fastpath-benchmark.test.ts`，修复 hunk 及前后 SHA/blob 见 `checks/minimal-source.patch` 和 `checks/source-manifest.json`。

新断言明确 `V6_DIRECTION_REPLAN=off`，要求 reward/shop provider 均 0 次、商店原脑题恰 1 次，固定 4 步奖励领取与 7 步商店流程，题面、选择与动作同 `V6_BUILD=off` 基线等价。保留每步 `pre_ms + planner_ms < 1000` 的原上限，覆盖范围补上先前跳过的首个商店步骤，并同时检查模拟时钟与真实时钟。5000 ms 仅是未调用 provider 的固定注入成本，不代表真实模型耗时。

旧断言在原方向生产源上复现红灯（1 例失败），原日志保留。修正后定向 2 文件 / 4 例通过（Vitest 11.28 秒），tsc exit 0；gitleaks 源码扫描 0。真实时钟奖励各步 1–2 ms，商店各步 1–12 ms（首商店 12 ms），原阈值未放宽；这些是本固定本地伪模型题的采样，不外推 live 性能。完整原始题面/动作与时钟记录在 `checks/measurements.json`，汇总在 `checks/measurement-summary.json`。

本次定向受测输入为原方向工作树正式源及本单叶修正，不是旧 main，也不宣称覆盖 ops `tree9000141a` 的精确联合。ops 的原四败 full 与旧输入保持原样；本会话没有启动 full、修改 main/live、运行 API/模型/对局。

按 ops 已明确选择，方向生产 `0cfebfa`、严格路由 `1d2d7f1`、必要 W4 `f74 → 79a → 544` 与 input `0929` 精确运输补丁、四项修复由 ops 同包窄原子集成 main/实际 live 候选；禁止只把本测试 cherry-pick 到仍有旧方向调用的 main。input 的 idleCombat/BOSS_KEYS 依赖不能因只摘父后增量而漏掉。不要整树运输 main/暂停的 805。生产兼容混合值算术与新 A/B/方向题消费边界由 W4 三项修复分别锁定，本单叶不改任何公式。完整联合绿与发布编号/双通知/移 STOP 均由 ops 原授权办理。
