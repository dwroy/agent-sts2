# Silent / Queen B4：撤回的整场模拟草稿

来源与实现任务均为 `20261014-072459-fix-batch`，账本 `silent-0464`；授权为 Roy 2026-10-07 12:11/12:35 及 docs/boss-sim.md §13/14。只观察 Silent，已结束对局最高 A10；派发写 A11 不构成 A11 机制证据。没有修改实盘出牌、药水、SL 或终局规则。

原始日志证据：ZVYUL2YP3518 F48 T3—T9 的火炬力量逐回合增长；EEVP0QTLMSX9 F48 T3—T6 同样从0到3；PD9AYQVMLQW6 F48 T3/T8/T9 的 PAPER_KRANE 文本及虚弱意图；KF9HMZKTFC3V F48 T6—T7 和 BSXYMFKN0VJ5 F48 T6—T8 的火炬死亡、Queen 力量/招式。所有原字节偏移、长度、SHA256 和首末帧在 queen-evidence.json；SL 实际结局、截尾来源在 queen-outcome-integrity.json。资料只来自本角色，既有 common 模型是冻结输入，不视为新机制证据。

V1/V2 使用顶层标记，被发现会进入实盘 memo 输入序列化，故废弃。V3 将 Silent A10 Queen 元数据放在整场准备专用 fightRelics 内，试补 Burn 的火炬力量增长、死亡后的 Queen 力量与虚弱倍率；只改 rollout.ts / rollout-live.ts。普通 boardRolloutInput 及实盘 rollout 后缀与 base 逐字节相同，基准固定 runner 的两端输出也相同。没有修改验收工具、旧测试、阈值、五回合配置或第三方内容。

**反证使整份草稿不成立。** 当前冻结表已含 `ENRAGE_MOVE.strength=2`。在 BSXYMFKN0VJ5 F48 T6 原始帧重放，下一回合日志 Queen 力量2，基准也为2，V3却为4；死亡钩子与原招式重复计算。初稿“死亡后力量完全缺失”的说法已在账本显式撤回。固定玩具夹具将 ENRAGE 力量设为0，虽真撤源码7红/5绿、恢复12绿，却不能证明真实表下死亡补丁正确。详见 real-frame-probe.json、real-frame-counterevidence.json。A10 伤害基数也已在原表内，不能把硬编码重复视为已证明修复。

火炬逐回合力量缺失可在 EEVP0QTLMSX9 原始帧复现：基准到T6仍0，V3为3；这只支持局部缺失，不支持整份草稿或跨进阶泛化。没有在验证集选择数值、策略或门槛。冻结扩充数据506场，原107 tune keys及切点保留，399 val；新4场只进val；200样本、seed=1+原始全数据行索引×101、t1/pre。整体映射只由原 trust.py 在 tune 拟合。完整性和缺行以 comparison/coverage.json 为准，缺预测不补造。

原入口 bash tools/test-sandbox.sh 的 tsc通过，vitest失败。快照导入路径问题已通过保留字节并改.snapshot后缀修正；原排序一致性用例曾断言失败，后续保留原120秒上限重试仍超时，基准同样超时。调度原15秒用例补跑通过；未改断言、未放宽时间、未把这些失败改写为全绿。所有初稿和失败日志保留。

草稿没有提交源代码、没有 live 合入、没有版本或消费者读回。源码工作区已恢复不可变 dispatch base `19b02dcc884825226c193ac1616f0c397f38fae9`。正式 before/after 均指向这一唯一可验收基准；未提交V3另有 shadow 档案，不能冒充正式候选。正式原验收自然拒绝缺覆盖或无改善。回退已经执行，仅保留 proposal-v3/candidate.patch 与源快照；不需要对 live 回退。

后续只应沿本批 fix-done→ops→watcher→Roy 传递反证与具体阻塞，由有界重试重新核实；不另建后台批次，不将本条记 bug-infra、accepted、implemented 或 shipped。
